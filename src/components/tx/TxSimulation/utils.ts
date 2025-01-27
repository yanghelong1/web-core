import { generatePreValidatedSignature } from '@gnosis.pm/safe-core-sdk/dist/src/utils/signatures'
import EthSafeTransaction from '@gnosis.pm/safe-core-sdk/dist/src/utils/transactions/SafeTransaction'
import { encodeMultiSendData } from '@gnosis.pm/safe-core-sdk/dist/src/utils/transactions/utils'
import { FEATURES, type SafeInfo, type ChainInfo } from '@gnosis.pm/safe-react-gateway-sdk'
import type { MetaTransactionData, SafeTransaction } from '@gnosis.pm/safe-core-sdk-types'

import {
  getMultiSendCallOnlyContractInstance,
  getSpecificGnosisSafeContractInstance,
} from '@/services/contracts/safeContracts'
import { TENDERLY_SIMULATE_ENDPOINT_URL, TENDERLY_ORG_NAME, TENDERLY_PROJECT_NAME } from '@/config/constants'
import { hasFeature } from '@/utils/chains'
import type { StateObject, TenderlySimulatePayload, TenderlySimulation } from '@/components/tx/TxSimulation/types'
import { getWeb3ReadOnly } from '@/hooks/wallets/web3'

export const isTxSimulationEnabled = (chain?: ChainInfo): boolean => {
  if (!chain) {
    return false
  }

  const isSimulationEnvSet =
    Boolean(TENDERLY_SIMULATE_ENDPOINT_URL) && Boolean(TENDERLY_ORG_NAME) && Boolean(TENDERLY_PROJECT_NAME)

  return isSimulationEnvSet && hasFeature(chain, FEATURES.TX_SIMULATION)
}

export const getSimulation = async (tx: TenderlySimulatePayload): Promise<TenderlySimulation> => {
  const data = await fetch(TENDERLY_SIMULATE_ENDPOINT_URL, {
    method: 'POST',
    body: JSON.stringify(tx),
  }).then((res) => {
    if (res.ok) {
      return res.json()
    }
    return res.json().then((data) => {
      throw new Error(`${res.status} - ${res.statusText}: ${data?.error?.message}`)
    })
  })

  return data as TenderlySimulation
}

export const getSimulationLink = (simulationId: string): string => {
  return `https://dashboard.tenderly.co/public/${TENDERLY_ORG_NAME}/${TENDERLY_PROJECT_NAME}/simulator/${simulationId}`
}

type SingleTransactionSimulationParams = {
  safe: SafeInfo
  executionOwner: string
  transactions: SafeTransaction
  gasLimit?: number
  canExecute: boolean
}

type MultiSendTransactionSimulationParams = {
  safe: SafeInfo
  executionOwner: string
  transactions: MetaTransactionData[]
  gasLimit?: number
  canExecute: boolean
}

export type SimulationTxParams = SingleTransactionSimulationParams | MultiSendTransactionSimulationParams

export const _getSingleTransactionPayload = (
  params: SingleTransactionSimulationParams,
): Pick<TenderlySimulatePayload, 'to' | 'input'> => {
  // If a transaction is executable we simulate with the proposed/selected gasLimit and the actual signatures
  let transaction = params.transactions
  const hasOwnerSignature = transaction.signatures.has(params.executionOwner)
  // If the owner's sig is missing and the tx threshold is not reached we add the owner's preValidated signature
  const needsOwnerSignature = !hasOwnerSignature && transaction.signatures.size < params.safe.threshold
  if (needsOwnerSignature) {
    const simulatedTransaction = new EthSafeTransaction(params.transactions.data)
    simulatedTransaction.addSignature(generatePreValidatedSignature(params.executionOwner))
    transaction = simulatedTransaction
  }

  const instance = getSpecificGnosisSafeContractInstance(params.safe)

  const input = instance.encode('execTransaction', [
    transaction.data.to,
    transaction.data.value,
    transaction.data.data,
    transaction.data.operation,
    transaction.data.safeTxGas,
    transaction.data.baseGas,
    transaction.data.gasPrice,
    transaction.data.gasToken,
    transaction.data.refundReceiver,
    transaction.encodedSignatures(),
  ])

  return {
    to: instance.getAddress(),
    input,
  }
}

export const _getMultiSendCallOnlyPayload = (
  params: MultiSendTransactionSimulationParams,
): Pick<TenderlySimulatePayload, 'to' | 'input'> => {
  const data = encodeMultiSendData(params.transactions)
  const instance = getMultiSendCallOnlyContractInstance(params.safe.chainId, params.safe.version)

  return {
    to: instance.getAddress(),
    input: instance.encode('multiSend', [data]),
  }
}

/* We need to overwrite the threshold stored in smart contract storage to 1
 to do a proper simulation that takes transaction guards into account.
 The threshold is stored in storage slot 4 and uses full 32 bytes slot
 Safe storage layout can be found here:
 https://github.com/gnosis/safe-contracts/blob/main/contracts/libraries/GnosisSafeStorage.sol */
const THRESHOLD_ONE_STORAGE_OVERRIDE = {
  [`0x${'4'.padStart(64, '0')}`]: `0x${'1'.padStart(64, '0')}`,
}

export const _getStateOverride = (
  address: string,
  balance?: string,
  code?: string,
  storage?: Record<string, string>,
): Record<string, StateObject> => {
  return {
    [address]: {
      balance,
      code,
      storage,
    },
  }
}

const isSingleTransactionSimulation = (params: SimulationTxParams): params is SingleTransactionSimulationParams => {
  return !Array.isArray(params.transactions)
}

/**
 * @returns true for single MultiSig transactions if the provided signatures plus the current owner's signature (if missing)
 * do not reach the safe's threshold.
 */
const isOverwriteThreshold = (params: SimulationTxParams) => {
  if (!isSingleTransactionSimulation(params)) {
    return false
  }
  const tx = params.transactions
  const hasOwnerSig = tx.signatures.has(params.executionOwner)
  const effectiveSigs = tx.signatures.size + (hasOwnerSig ? 0 : 1)
  return params.safe.threshold > effectiveSigs
}

const getLatestBlockGasLimit = async (): Promise<number> => {
  const web3ReadOnly = getWeb3ReadOnly()
  const latestBlock = await web3ReadOnly?.getBlock('latest')
  if (!latestBlock) {
    throw Error('Could not determine block gas limit')
  }
  return latestBlock.gasLimit.toNumber()
}

export const getSimulationPayload = async (params: SimulationTxParams): Promise<TenderlySimulatePayload> => {
  const gasLimit = params.gasLimit || (await getLatestBlockGasLimit())

  const payload = isSingleTransactionSimulation(params)
    ? _getSingleTransactionPayload(params)
    : _getMultiSendCallOnlyPayload(params)

  const overwriteThreshold = isOverwriteThreshold(params)

  return {
    ...payload,
    network_id: params.safe.chainId,
    from: params.executionOwner,
    gas: gasLimit,
    // With gas price 0 account don't need token for gas
    gas_price: '0',
    state_objects: overwriteThreshold
      ? _getStateOverride(params.safe.address.value, undefined, undefined, THRESHOLD_ONE_STORAGE_OVERRIDE)
      : undefined,
    save: true,
    save_if_fails: true,
  }
}
