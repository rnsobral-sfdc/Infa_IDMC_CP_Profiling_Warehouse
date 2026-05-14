import '../styles/globals.css'
import type { AppProps } from 'next/app'
import { FluentProvider, webLightTheme } from '@fluentui/react-components'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <FluentProvider theme={webLightTheme}>
      <Component {...pageProps} />
    </FluentProvider>
  )
}
