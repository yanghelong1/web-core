import { Typography, Link as MuiLink } from '@mui/material'
import Link from 'next/link'
import type { FallbackRender } from '@sentry/react'

import { IS_PRODUCTION } from '@/config/constants'
import { AppRoutes } from '@/config/routes'
import WarningIcon from '@/components/common/icons/WarningIcon'

import css from '@/components/common/ErrorBoundary/styles.module.css'

const ErrorBoundary: FallbackRender = ({ error, componentStack }) => {
  return (
    <div className={css.container}>
      <div className={css.wrapper}>
        <Typography variant="h3" color="text.primary">
          Something went wrong,
          <br />
          please try again.
        </Typography>

        <WarningIcon />

        {IS_PRODUCTION ? (
          <Typography color="text.primary">
            In case the problem persists, please reach out to us via our{' '}
            <Link href="https://help.gnosis-safe.io" passHref target="_blank" rel="noopener noreferrer">
              <MuiLink>Help Center</MuiLink>
            </Link>
          </Typography>
        ) : (
          <>
            <Typography color="error">{error.toString()}</Typography>
            <Typography color="error">{componentStack}</Typography>
          </>
        )}

        <Typography mt={2}>
          <Link href={AppRoutes.welcome} passHref target="_blank" rel="noopener noreferrer" color="primary">
            <MuiLink>Go Home</MuiLink>
          </Link>
        </Typography>
      </div>
    </div>
  )
}

export default ErrorBoundary
