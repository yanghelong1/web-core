import React from 'react'
import { BeamerConfig, BeamerMethods } from '@services/beamer/types'

declare global {
  interface Window {
    isDesktop?: boolean
    ethereum?: {
      autoRefreshOnNetworkChange: boolean
      isMetaMask: boolean
    }
    beamer_config?: BeamerConfig
    Beamer?: BeamerMethods
    dataLayer?: DataLayerArgs['dataLayer']
    Cypress?
  }
}

declare module '*.svg' {
  const content: any
  export const ReactComponent: React.FC<React.SVGProps<SVGSVGElement>>
  export default content
}

export {}
