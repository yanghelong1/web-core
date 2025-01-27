import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { CookieType } from './cookiesSlice'
import { RootState } from '.'

export enum PopupType {
  COOKIES = 'cookies',
}

type PopupState = {
  [PopupType.COOKIES]: {
    open: boolean
    warningKey?: CookieType
  }
}

const initialState: PopupState = {
  [PopupType.COOKIES]: {
    open: false,
  },
}

export const popupSlice = createSlice({
  name: 'popups',
  initialState,
  reducers: {
    openCookieBanner: (state, { payload }: PayloadAction<{ warningKey?: CookieType }>) => {
      state[PopupType.COOKIES] = {
        ...payload,
        open: true,
      }
    },
    closeCookieBanner: (state) => {
      state[PopupType.COOKIES] = { open: false }
    },
  },
})

export const { openCookieBanner, closeCookieBanner } = popupSlice.actions

export const selectCookieBanner = (state: RootState) => state[popupSlice.name][PopupType.COOKIES]
