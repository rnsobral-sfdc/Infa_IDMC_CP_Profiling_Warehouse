"""
Data Explorer API - for debugging and troubleshooting the star schema.
Allows browsing any table and viewing raw data.
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import inspect, text
from typing import List, Dict, Any
from ..core.database import get_db

router = APIRouter(prefix="/data-explorer", tags=["data-explorer"])


def build_filter_clause(
    table_name: str,
    filters: Dict[str, List[Any]],
    column_names: List[str]
) -> tuple:
    """
    Build WHERE clause with parameterized queries for filters.

    Args:
        table_name: Name of the table
        filters: Dict mapping column names to list of values
        column_names: Valid column names for the table

    Returns: Tuple of (where_clause, params_dict)
    """
    if not filters:
        return "", {}

    where_parts = []
    params = {}

    for col_name, values in filters.items():
        # Validate column exists
        if col_name not in column_names:
            continue

        # Separate NULL and non-NULL values
        has_null = None in values
        non_null_values = [v for v in values if v is not None]

        col_conditions = []

        # Handle non-NULL values with IN clause
        if non_null_values:
            param_names = []
            for i, val in enumerate(non_null_values):
                param_name = f"{col_name}_val_{i}"
                params[param_name] = val
                param_names.append(f":{param_name}")

            col_conditions.append(f"[{col_name}] IN ({', '.join(param_names)})")

        # Handle NULL values
        if has_null:
            col_conditions.append(f"[{col_name}] IS NULL")

        # Combine conditions for this column with OR
        if col_conditions:
            where_parts.append(f"({' OR '.join(col_conditions)})")

    # Combine all columns with AND
    if where_parts:
        return f"WHERE {' AND '.join(where_parts)}", params

    return "", {}


@router.get("/tables")
def list_tables(db: Session = Depends(get_db)):
    """
    List all tables in the database with their row counts.

    Returns: List of table names and metadata
    """
    inspector = inspect(db.bind)
    tables = inspector.get_table_names()

    result = []
    for table_name in sorted(tables):
        # Get row count
        try:
            count_query = text(f"SELECT COUNT(*) as count FROM {table_name}")
            row_count = db.execute(count_query).scalar()
        except Exception as e:
            row_count = 0

        # Get column info
        columns = inspector.get_columns(table_name)

        result.append({
            "table_name": table_name,
            "row_count": row_count,
            "column_count": len(columns),
            "columns": [col['name'] for col in columns]
        })

    return result


@router.get("/tables/{table_name}")
def get_table_data(
    table_name: str,
    limit: int = Query(100, le=1000),
    offset: int = Query(0, ge=0),
    order_by: str = Query(None),
    order_desc: bool = Query(False),
    filters: str = Query(None),
    db: Session = Depends(get_db)
):
    """
    Get data from a specific table with pagination, sorting, and filtering.

    Args:
        table_name: Name of the table
        limit: Number of rows to return (max 1000)
        offset: Number of rows to skip
        order_by: Column name to sort by
        order_desc: Sort descending if True
        filters: JSON-encoded filter object

    Returns: Dict with data and metadata
    """
    import json

    # Validate table exists
    inspector = inspect(db.bind)
    tables = inspector.get_table_names()

    if table_name not in tables:
        return {"error": f"Table '{table_name}' not found"}

    # Get columns
    columns = inspector.get_columns(table_name)
    column_names = [col['name'] for col in columns]
    column_types = {col['name']: str(col['type']) for col in columns}

    # Parse filters
    filters_dict = {}
    if filters:
        try:
            filters_dict = json.loads(filters)
            if not isinstance(filters_dict, dict):
                return {"error": "Filters must be a JSON object"}
        except json.JSONDecodeError:
            return {"error": "Invalid filters format"}

    # Build query
    query = f"SELECT * FROM [{table_name}]"

    # Add filters
    where_clause, filter_params = build_filter_clause(table_name, filters_dict, column_names)
    query += f" {where_clause}" if where_clause else ""

    # Add ordering
    if order_by and order_by in column_names:
        direction = "DESC" if order_desc else "ASC"
        query += f" ORDER BY [{order_by}] {direction}"
    else:
        # Get first column for default ordering (SQLite requires ORDER BY for LIMIT/OFFSET)
        if column_names:
            query += f" ORDER BY [{column_names[0]}]"

    # Add pagination (SQLite syntax)
    query += f" LIMIT {limit} OFFSET {offset}"

    # Execute query with parameters
    result = db.execute(text(query), filter_params)
    rows = result.fetchall()

    # Convert to list of dicts
    data = []
    for row in rows:
        row_dict = {}
        for i, col_name in enumerate(column_names):
            value = row[i]
            # Convert to string for JSON serialization
            if value is not None:
                row_dict[col_name] = str(value) if not isinstance(value, (str, int, float, bool)) else value
            else:
                row_dict[col_name] = None
        data.append(row_dict)

    # Get filtered count
    filtered_count_query = f"SELECT COUNT(*) as count FROM [{table_name}] {where_clause}"
    filtered_count = db.execute(text(filtered_count_query), filter_params).scalar()

    # Get unfiltered count (total rows without filters)
    unfiltered_count_query = text(f"SELECT COUNT(*) as count FROM [{table_name}]")
    unfiltered_count = db.execute(unfiltered_count_query).scalar()

    return {
        "table_name": table_name,
        "columns": column_names,
        "column_types": column_types,
        "data": data,
        "total_count": filtered_count,  # Count after filters
        "unfiltered_count": unfiltered_count,  # Total rows without filters
        "limit": limit,
        "offset": offset,
        "returned_rows": len(data),
        "active_filters": filters_dict if filters_dict else None
    }


@router.get("/tables/{table_name}/columns/{column_name}/distinct")
def get_distinct_column_values(
    table_name: str,
    column_name: str,
    limit: int = Query(1000, le=5000),
    search: str = Query(None),
    include_counts: bool = Query(False),
    db: Session = Depends(get_db)
):
    """
    Get distinct values for a column.

    Args:
        table_name: Name of the table
        column_name: Name of the column
        limit: Maximum number of distinct values to return
        search: Optional search term to filter values
        include_counts: Include count of rows for each value

    Returns: Dict with distinct values and metadata
    """
    import json

    # Validate table exists
    inspector = inspect(db.bind)
    tables = inspector.get_table_names()

    if table_name not in tables:
        return {"error": f"Table '{table_name}' not found"}

    # Validate column exists
    columns = inspector.get_columns(table_name)
    column_names = [col['name'] for col in columns]

    if column_name not in column_names:
        return {"error": f"Column '{column_name}' not found in table '{table_name}'"}

    try:
        # Build query for distinct values (SQLite syntax)
        if include_counts:
            # With counts: GROUP BY with COUNT
            query = f"""
                SELECT [{column_name}], COUNT(*) as count
                FROM [{table_name}]
            """

            if search:
                query += f" WHERE CAST([{column_name}] AS TEXT) LIKE :search_pattern"

            query += f" GROUP BY [{column_name}] ORDER BY count DESC, [{column_name}] LIMIT {limit}"
        else:
            # Without counts: Simple DISTINCT
            query = f"""
                SELECT DISTINCT [{column_name}]
                FROM [{table_name}]
            """

            if search:
                query += f" WHERE CAST([{column_name}] AS TEXT) LIKE :search_pattern"

            query += f" ORDER BY [{column_name}] LIMIT {limit}"

        # Execute query
        params = {}
        if search:
            params["search_pattern"] = f"%{search}%"

        result = db.execute(text(query), params)
        rows = result.fetchall()

        # Get total distinct count (without search filter)
        count_query = f"SELECT COUNT(DISTINCT [{column_name}]) as total FROM [{table_name}]"
        total_distinct = db.execute(text(count_query)).scalar()

        # Format response
        values = []
        for row in rows:
            value = row[0]
            value_dict = {
                "value": value,
                "display": str(value) if value is not None else "NULL"
            }

            if include_counts:
                value_dict["count"] = row[1]

            values.append(value_dict)

        return {
            "column_name": column_name,
            "values": values,
            "total_distinct": total_distinct,
            "is_truncated": len(values) >= limit,
            "returned_count": len(values)
        }

    except Exception as e:
        return {"error": str(e)}


@router.get("/query/{table_name}")
def query_table(
    table_name: str,
    filter_column: str = Query(None),
    filter_value: str = Query(None),
    limit: int = Query(100, le=1000),
    db: Session = Depends(get_db)
):
    """
    Query a table with a simple filter.

    Args:
        table_name: Name of the table
        filter_column: Column to filter on
        filter_value: Value to filter for
        limit: Number of rows to return

    Returns: Filtered data
    """
    # Validate table exists
    inspector = inspect(db.bind)
    tables = inspector.get_table_names()

    if table_name not in tables:
        return {"error": f"Table '{table_name}' not found"}

    # Get columns
    columns = inspector.get_columns(table_name)
    column_names = [col['name'] for col in columns]

    # Build query
    if filter_column and filter_value and filter_column in column_names:
        query = f"SELECT * FROM {table_name} WHERE {filter_column} = :value LIMIT {limit}"
        result = db.execute(text(query), {"value": filter_value})
    else:
        query = f"SELECT * FROM {table_name} LIMIT {limit}"
        result = db.execute(text(query))

    rows = result.fetchall()

    # Convert to list of dicts
    data = []
    for row in rows:
        row_dict = {}
        for i, col_name in enumerate(column_names):
            value = row[i]
            row_dict[col_name] = str(value) if value is not None and not isinstance(value, (str, int, float, bool)) else value
        data.append(row_dict)

    return {
        "table_name": table_name,
        "filter_column": filter_column,
        "filter_value": filter_value,
        "columns": column_names,
        "data": data,
        "returned_rows": len(data)
    }
