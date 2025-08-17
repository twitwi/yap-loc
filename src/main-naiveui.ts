
import Color from 'colorjs.io'
import type { GlobalThemeOverrides } from 'naive-ui'
import type { Type } from 'naive-ui/es/button/src/interface'
import router from './router'

export const hex = (c: Color) => '#'+c.to('srgb').toString().split(/[(%]/).slice(1, 4).map((s:string)=>Math.round((parseFloat(s.trim())*255/100)).toString(16).padStart(2, '0')).join('')

export function getTheme(colorString: string) {
  const color = new Color(colorString).to('oklch')
  const theme: GlobalThemeOverrides = {
    common: {
      primaryColor: hex(color),
      primaryColorHover: hex(color.clone().set('l', (l) => l + 0.05)),
      primaryColorPressed: hex(color.clone().set('l', (l) => l - 0.05)),
    },
    Button: {
      heightMedium: '50px',
      fontSizeMedium: '22px',
    },
  }
  return theme
}

export function bindRouterLink(name: string) {
  const ifRoute = (name: string) => (router.currentRoute.value.name === name ? 'primary' : 'default') as Type
  return {
    type: ifRoute(name),
    onClick: () => {
      router.replace({ name })
    },
  }
}
