import { SafeAppData } from '@gnosis.pm/safe-react-gateway-sdk'
import { SafeAppCardVariants } from '@/components/safe-apps/AppCard'

type SectionProps = {
  title: string
  prependAddCustomAppCard?: boolean
  apps: SafeAppData[]
  pinnedIds?: Set<number>
  onAddCustomApp?: (app: SafeAppData) => void
  onPinApp?: (appId: number) => void
  onDeleteApp?: (app: SafeAppData) => void
  cardVariant?: SafeAppCardVariants
}

type BranchingSectionProps = SectionProps & { collapsible?: boolean }

export type { SectionProps, BranchingSectionProps }
