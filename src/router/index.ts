import { createRouter, createWebHashHistory } from 'vue-router'
import ShowMyLoc from '@/views/ShowMyLoc.vue'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'show-my-loc',
      component: ShowMyLoc,
    },
  ],
})

export default router
