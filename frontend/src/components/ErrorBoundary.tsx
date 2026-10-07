import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, Home, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
  info: string | null
}

/**
 * Catches render-time crashes so a bug never presents as a blank white page.
 */
class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: null }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info)
    this.setState({ info: info.componentStack ?? null })
  }

  private reset = () => this.setState({ error: null, info: null })

  private reload = () => window.location.reload()

  render() {
    const { error, info } = this.state

    if (!error) return this.props.children

    return (
      <div className="flex min-h-dvh items-center justify-center p-6" dir="rtl">
        <div className="vedic-aurora" aria-hidden="true" />
        <div className="vedic-grid-overlay" aria-hidden="true" />

        <div className="glass relative z-10 w-full max-w-lg p-8 text-center" role="alert">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/10">
            <AlertTriangle className="h-7 w-7 text-destructive" aria-hidden="true" />
          </div>

          <h1 className="mb-2 text-2xl font-bold">مشکلی پیش آمد</h1>
          <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
            در نمایش این صفحه خطایی رخ داد. می‌توانید دوباره تلاش کنید یا به صفحه اصلی بازگردید.
          </p>

          <pre
            dir="ltr"
            className="num mb-6 max-h-40 overflow-auto rounded-xl border border-border/60 bg-background/60 p-4 text-left text-xs text-muted-foreground"
          >
            {error.message}
          </pre>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
            <Button variant="outline" onClick={this.reset}>
              <RotateCcw className="ml-2 h-4 w-4" />
              تلاش دوباره
            </Button>
            <Button onClick={this.reload}>
              <Home className="ml-2 h-4 w-4" />
              بازگشت به خانه
            </Button>
          </div>

          {info && (
            <details className="mt-6 text-right text-xs text-muted-foreground/70">
              <summary className="cursor-pointer select-none">جزئیات فنی</summary>
              <pre className="num mt-2 max-h-48 overflow-auto text-left" dir="ltr">
                {info.trim()}
              </pre>
            </details>
          )}
        </div>
      </div>
    )
  }
}

export default ErrorBoundary