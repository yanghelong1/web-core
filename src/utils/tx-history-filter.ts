import { useMemo } from 'react'
import { useRouter } from 'next/router'
import {
  getIncomingTransfers,
  getModuleTransactions,
  getMultisigTransactions,
  type TransactionListPage,
} from '@gnosis.pm/safe-react-gateway-sdk'
import type { operations } from '@gnosis.pm/safe-react-gateway-sdk/dist/types/api'
import type { ParsedUrlQuery } from 'querystring'
import { startOfDay, endOfDay } from 'date-fns'

import { TxFilterFormState } from '@/components/transactions/TxFilterForm'
import { safeFormatUnits, safeParseUnits } from '@/utils/formatters'

type IncomingTxFilter = NonNullable<operations['incoming_transfers']['parameters']['query']>
type MultisigTxFilter = NonNullable<operations['multisig_transactions']['parameters']['query']>
type ModuleTxFilter = NonNullable<operations['module_transactions']['parameters']['query']>

export enum TxFilterType {
  INCOMING = 'Incoming',
  MULTISIG = 'Outgoing',
  MODULE = 'Module-based',
}

export type TxFilter = {
  type: TxFilterType
  filter: IncomingTxFilter | MultisigTxFilter | ModuleTxFilter // CGW filter
}

export const _omitNullish = (data: { [key: string]: any }) => {
  return Object.fromEntries(
    Object.entries(data).filter(([_, value]) => {
      return value !== '' && value != null
    }),
  )
}

export const _isValidTxFilterType = (type: unknown) => {
  return !!type && Object.values(TxFilterType).includes(type as TxFilterType)
}

export const _isModuleFilter = (filter: TxFilter['filter']): filter is ModuleTxFilter => {
  return 'module' in filter
}

// Spread TxFilter basically
type TxFilterUrlQuery = {
  type: TxFilter['type']
} & TxFilter['filter']

export const txFilter = {
  parseUrlQuery: ({ type, ...filter }: ParsedUrlQuery): TxFilter | null => {
    if (!_isValidTxFilterType(type)) return null

    return {
      type: type as TxFilterType,
      filter: filter as TxFilter['filter'],
    }
  },

  parseFormData: ({ type, ...formData }: TxFilterFormState): TxFilter => {
    const filter: TxFilter['filter'] = _omitNullish({
      ...formData,
      execution_date__gte: formData.execution_date__gte
        ? startOfDay(formData.execution_date__gte).toISOString()
        : undefined,
      execution_date__lte: formData.execution_date__lte
        ? endOfDay(formData.execution_date__lte).toISOString()
        : undefined,
      value: formData.value ? safeParseUnits(formData.value, 18)?.toString() : undefined,
    })

    return {
      type,
      filter,
    }
  },

  formatUrlQuery: ({ type, filter }: TxFilter): TxFilterUrlQuery => {
    return {
      type,
      ...filter,
    }
  },

  formatFormData: ({ type, filter }: TxFilter): Partial<TxFilterFormState> => {
    const isModule = _isModuleFilter(filter)

    return {
      type,
      ...filter,
      execution_date__gte: !isModule && filter.execution_date__gte ? new Date(filter.execution_date__gte) : null,
      execution_date__lte: !isModule && filter.execution_date__lte ? new Date(filter.execution_date__lte) : null,
      value: !isModule && filter.value ? safeFormatUnits(filter.value, 18)?.toString() : '',
    }
  },
}

export const useTxFilter = (): [TxFilter | null, (filter: TxFilter | null) => void] => {
  const router = useRouter()
  const filter = useMemo(() => txFilter.parseUrlQuery(router.query), [router.query])

  const setQuery = (filter: TxFilter | null) => {
    router.push({
      pathname: router.pathname,
      query: {
        safe: router.query.safe,
        ...(filter && txFilter.formatUrlQuery(filter)),
      },
    })
  }

  return [filter, setQuery]
}

export const fetchFilteredTxHistory = async (
  chainId: string,
  safeAddress: string,
  filterData: TxFilter,
  pageUrl?: string,
): Promise<TransactionListPage> => {
  const fetchPage = () => {
    switch (filterData.type) {
      case TxFilterType.INCOMING: {
        return getIncomingTransfers(chainId, safeAddress, filterData.filter, pageUrl)
      }
      case TxFilterType.MULTISIG: {
        const filter = {
          ...filterData.filter,
          // We only filter historical transactions
          executed: 'true',
        }

        return getMultisigTransactions(chainId, safeAddress, filter, pageUrl)
      }
      case TxFilterType.MODULE: {
        return getModuleTransactions(chainId, safeAddress, filterData.filter, pageUrl)
      }
      default: {
        return { results: [] }
      }
    }
  }

  return await fetchPage()
}
