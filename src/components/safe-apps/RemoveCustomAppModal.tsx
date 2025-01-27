import * as React from 'react'
import { DialogActions, DialogContent, Typography, Button } from '@mui/material'
import { SafeAppData } from '@gnosis.pm/safe-react-gateway-sdk'
import ModalDialog from '@/components/common/ModalDialog'

type Props = {
  open: boolean
  app: SafeAppData
  onClose: () => void
  onConfirm: (appId: number) => void
}

const RemoveCustomAppModal = ({ open, onClose, onConfirm, app }: Props) => (
  <ModalDialog open={open} onClose={onClose} dialogTitle="Confirm app removal">
    <DialogContent>
      <Typography variant="h6" sx={{ pt: 3 }}>
        Are you sure you want to remove the <b>{app.name}</b> app?
      </Typography>
    </DialogContent>
    <DialogActions disableSpacing>
      <Button onClick={onClose}>Cancel</Button>
      <Button color="error" variant="contained" onClick={() => onConfirm(app.id)}>
        Remove
      </Button>
    </DialogActions>
  </ModalDialog>
)

export { RemoveCustomAppModal }
