import { createRouter, createWebHashHistory } from 'vue-router'
import ShowMyLoc from '@/views/ShowMyLoc.vue'
import TrackContrib from '@/views/TrackContrib.vue'
import Config from '@/views/ConfigView.vue'
import BackupView from '@/views/BackupView.vue'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'show-my-loc',
      component: ShowMyLoc,
    },
    {
      path: '/contrib',
      name: 'contrib',
      component: TrackContrib,
    },
    {
      path: '/config',
      name: 'config',
      component: Config,
    },
    {
      path: '/backup',
      name: 'backup',
      component: BackupView,
    },
  ],
})

export default router
