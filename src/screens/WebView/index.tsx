import React, { useContext, useLayoutEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router'
import ElectronStore from 'electron-store'

import { UpdateComponent } from 'src/components/UI'
import WebviewControls from 'src/components/UI/WebviewControls'
import ContextProvider from 'src/state/ContextProvider'
import { Webview } from 'src/types'

const Store = window.require('electron-store')
const configStore: ElectronStore = new Store({
  cwd: 'store'
})
const { clipboard, ipcRenderer } = window.require('electron')
import './index.css'

type Props = {
  isLogin?: boolean
}

type SID = {
  sid: string
}

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.85 Safari/537.36 Edg/90.0.818.46'

export default function WebView({ isLogin }: Props) {
  const { i18n } = useTranslation()
  const { pathname } = useLocation()
  const { t } = useTranslation()
  const { refreshLibrary } = useContext(ContextProvider)
  const [loading, setLoading] = useState<{
    refresh: boolean
    message: string
  }>({ refresh: true, message: t('loading.website', 'Loading Website') })
  const user = configStore.get('userInfo')

  let lang = i18n.language
  if (i18n.language === 'pt') {
    lang = 'pt-BR'
  }

  const loginUrl =
    'https://www.epicgames.com/id/login?redirectUrl=https%3A%2F%2Fwww.epicgames.com%2Fid%2Fapi%2Fredirect'
  const epicStore = `https://www.epicgames.com/store/${lang}/`
  const wikiURL =
    'https://github.com/Heroic-Games-Launcher/HeroicGamesLauncher/wiki'

  const trueAsStr = 'true' as unknown as boolean | undefined
  const webview = document.querySelector('webview') as Webview

  const startUrl = isLogin ? '/login' : pathname
  const urls = {
    '/epicstore': epicStore,
    '/wiki': wikiURL,
    '/login': loginUrl
  }

  useLayoutEffect(() => {
    const webview = document.querySelector('webview') as Webview
    if (webview) {
      const loadstop = () => {
        setLoading({ ...loading, refresh: false })

        // Deals with Login
        if (!user) {
          webview.findInPage('sid')
          webview.addEventListener('found-in-page', async (res) => {
            const data = res as Event & { result: { matches: number } }
            if (data.result.matches) {
              webview.focus()
              webview.selectAll()
              webview.copy()
              const { sid }: SID = JSON.parse(clipboard.readText())
              try {
                setLoading({
                  refresh: true,
                  message: t('status.logging', 'Logging In...')
                })
                await ipcRenderer.invoke('login', sid)
                setLoading({
                  refresh: true,
                  message: t('status.loading', 'Loading Game list, please wait')
                })
                await refreshLibrary({
                  fullRefresh: true,
                  runInBackground: false
                })
                setLoading({ ...loading, refresh: false })
              } catch (error) {
                console.error(error)
                ipcRenderer.send('logError', error)
              }
            }
          })
        }
      }

      webview.addEventListener('did-stop-loading', loadstop)
    }
  }, [])

  return (
    <div className="webViewContainer">
      <WebviewControls webview={webview} initURL={urls[startUrl]} />
      {loading.refresh && <UpdateComponent message={loading.message} />}
      <webview
        partition="persist:epicstore"
        src={urls[startUrl]}
        allowpopups={trueAsStr}
        useragent={USER_AGENT}
      />
    </div>
  )
}
