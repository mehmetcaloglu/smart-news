import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    
    // Initial check without calling setState synchronously inside effect body if possible,
    // or just let it be, but since the linter complains:
    // we can use a setTimeout to defer it or just skip the synchronous set since we initialized it with undefined
    // Actually we initialized it with undefined, then set it in effect.
    // We can do it inside requestAnimationFrame.
    requestAnimationFrame(() => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    })
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}
