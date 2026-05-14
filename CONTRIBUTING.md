# Contributing to IDMC Profiling Extractor

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Respect different viewpoints and experiences

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/YOUR_USERNAME/idmc-profiling-extractor/issues)
2. If not, create a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - Your environment (OS, Python version, Node version)
   - Screenshots if applicable
   - Error messages and logs

### Suggesting Features

1. Check if the feature has been suggested in [Issues](https://github.com/YOUR_USERNAME/idmc-profiling-extractor/issues)
2. Open a new issue with:
   - Clear description of the feature
   - Use cases and benefits
   - Possible implementation approach
   - Examples from other tools (if applicable)

### Pull Requests

1. **Fork** the repository
2. **Create a branch** for your feature:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes**:
   - Follow the code style guide
   - Add tests if applicable
   - Update documentation
4. **Test your changes**:
   ```bash
   # Backend tests
   cd backend
   pytest
   
   # Frontend linting
   cd frontend
   npm run lint
   ```
5. **Commit your changes**:
   ```bash
   git commit -m "Add feature: brief description"
   ```
6. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```
7. **Open a Pull Request** with:
   - Clear title and description
   - Reference related issues
   - List of changes made
   - Screenshots if UI changes

## Development Guidelines

### Backend (Python)

- Follow [PEP 8](https://pep8.org/) style guide
- Use type hints where possible
- Add docstrings to functions and classes
- Keep functions focused and small
- Handle errors gracefully
- Use async/await for I/O operations

Example:
```python
async def get_profile_data(profile_id: str, db: Session) -> Optional[ProfileData]:
    """
    Fetch profile data from database.
    
    Args:
        profile_id: UUID of the profile
        db: Database session
        
    Returns:
        ProfileData object or None if not found
    """
    try:
        result = db.query(Profile).filter_by(id=profile_id).first()
        return result
    except Exception as e:
        logger.error(f"Failed to fetch profile {profile_id}: {e}")
        return None
```

### Frontend (TypeScript/React)

- Use functional components with hooks
- Follow React best practices
- Use TypeScript types/interfaces
- Keep components small and focused
- Use Fluent UI components
- Handle loading and error states

Example:
```typescript
interface TaskCardProps {
  task: ProfilingTask;
  onSelect: (id: string) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onSelect }) => {
  const [loading, setLoading] = useState(false);
  
  const handleClick = async () => {
    setLoading(true);
    try {
      await onSelect(task.id);
    } catch (error) {
      console.error('Failed to select task:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Card onClick={handleClick}>
      {loading ? <Spinner /> : <Text>{task.name}</Text>}
    </Card>
  );
};
```

### Database Changes

- Create Alembic migrations for schema changes
- Test migrations both forward and rollback
- Update model classes
- Document changes in comments

### API Changes

- Maintain backward compatibility when possible
- Update API documentation
- Add tests for new endpoints
- Version breaking changes

## Testing

### Backend Tests
```bash
cd backend
pytest -v
pytest --cov=app  # With coverage
```

### Frontend Tests
```bash
cd frontend
npm test
npm run lint
```

## Documentation

- Update README.md for significant changes
- Add inline code comments for complex logic
- Update API documentation
- Add examples for new features

## Commit Messages

Follow conventional commits format:

- `feat: add new feature`
- `fix: resolve bug in component`
- `docs: update README`
- `style: format code`
- `refactor: restructure module`
- `test: add test cases`
- `chore: update dependencies`

## Review Process

1. All PRs require at least one review
2. CI/CD checks must pass
3. Address review feedback
4. Maintainer will merge after approval

## Questions?

Feel free to:
- Open an issue for discussion
- Ask questions in PR comments
- Reach out to maintainers

Thank you for contributing! 🎉
