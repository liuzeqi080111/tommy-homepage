/* ============================================================================
   site/gallery-data.js —— 站内媒体数据（站主 spec 五：统一数据结构）

   · galleryItems：环海南岛骑行照片 28 张，路径全部来自站内真实文件
     site/assets/ride-photos/ride-01.jpg ... ride-28.jpg
   · cyclingItems：环岛骑行原片 3 段，复用站内已有视频文件
     （ep01 / ep02 / 好汉坡放坡 的对应关系沿用旧版 #ride 的 .video-grid 标注）
   · 以后加照片：把新文件放进 site/assets/ride-photos/ 后重跑
     .deepworks/tmp/gen_gallery_data.py 即可，无需改 HTML / JS。
   · 本文件不含任何未确认的个人经历（守卫见 server/profile.md）。
   ============================================================================ */

window.galleryItems = [
  {
    id: 1,
    src: 'assets/ride-photos/ride-01.jpg',
    title: '环海南岛骑行 01',
    description: '环海南岛骑行记录 · 2026 年暑假',
    date: '2026 · 暑假'
  },
  {
    id: 2,
    src: 'assets/ride-photos/ride-02.jpg',
    title: '环海南岛骑行 02',
    description: '环海南岛骑行记录 · 2026 年暑假',
    date: '2026 · 暑假'
  },
  {
    id: 3,
    src: 'assets/ride-photos/ride-03.jpg',
    title: '环海南岛骑行 03',
    description: '环海南岛骑行记录 · 2026 年暑假',
    date: '2026 · 暑假'
  },
  {
    id: 4,
    src: 'assets/ride-photos/ride-04.jpg',
    title: '环海南岛骑行 04',
    description: '环海南岛骑行记录 · 2026 年暑假',
    date: '2026 · 暑假'
  },
  {
    id: 5,
    src: 'assets/ride-photos/ride-05.jpg',
    title: '环海南岛骑行 05',
    description: '环海南岛骑行记录 · 2026 年暑假',
    date: '2026 · 暑假'
  },
  {
    id: 6,
    src: 'assets/ride-photos/ride-06.jpg',
    title: '环海南岛骑行 06',
    description: '环海南岛骑行记录 · 2026 年暑假',
    date: '2026 · 暑假'
  },
  {
    id: 7,
    src: 'assets/ride-photos/ride-07.jpg',
    title: '环海南岛骑行 07',
    description: '环海南岛骑行记录 · 2026 年暑假',
    date: '2026 · 暑假'
  },
  {
    id: 8,
    src: 'assets/ride-photos/ride-08.jpg',
    title: '环海南岛骑行 08',
    description: '环海南岛骑行记录 · 2026 年暑假',
    date: '2026 · 暑假'
  },
  {
    id: 9,
    src: 'assets/ride-photos/ride-09.jpg',
    title: '环海南岛骑行 09',
    description: '环海南岛骑行记录 · 2026 年暑假',
    date: '2026 · 暑假'
  },
  {
    id: 10,
    src: 'assets/ride-photos/ride-10.jpg',
    title: '环海南岛骑行 10',
    description: '环海南岛骑行记录 · 2026 年暑假',
    date: '2026 · 暑假'
  },
  {
    id: 11,
    src: 'assets/ride-photos/ride-11.jpg',
    title: '环海南岛骑行 11',
    description: '环海南岛骑行记录 · 2026 年暑假',
    date: '2026 · 暑假'
  },
  {
    id: 12,
    src: 'assets/ride-photos/ride-12.jpg',
    title: '环海南岛骑行 12',
    description: '环海南岛骑行记录 · 2026 年暑假',
    date: '2026 · 暑假'
  },
  {
    id: 13,
    src: 'assets/ride-photos/ride-13.jpg',
    title: '环海南岛骑行 13',
    description: '环海南岛骑行记录 · 2026 年暑假',
    date: '2026 · 暑假'
  },
  {
    id: 14,
    src: 'assets/ride-photos/ride-14.jpg',
    title: '环海南岛骑行 14',
    description: '环海南岛骑行记录 · 2026 年暑假',
    date: '2026 · 暑假'
  },
  {
    id: 15,
    src: 'assets/ride-photos/ride-15.jpg',
    title: '环海南岛骑行 15',
    description: '环海南岛骑行记录 · 2026 年暑假',
    date: '2026 · 暑假'
  },
  {
    id: 16,
    src: 'assets/ride-photos/ride-16.jpg',
    title: '环海南岛骑行 16',
    description: '环海南岛骑行记录 · 2026 年暑假',
    date: '2026 · 暑假'
  },
  {
    id: 17,
    src: 'assets/ride-photos/ride-17.jpg',
    title: '环海南岛骑行 17',
    description: '环海南岛骑行记录 · 2026 年暑假',
    date: '2026 · 暑假'
  },
  {
    id: 18,
    src: 'assets/ride-photos/ride-18.jpg',
    title: '环海南岛骑行 18',
    description: '环海南岛骑行记录 · 2026 年暑假',
    date: '2026 · 暑假'
  },
  {
    id: 19,
    src: 'assets/ride-photos/ride-19.jpg',
    title: '环海南岛骑行 19',
    description: '环海南岛骑行记录 · 2026 年暑假',
    date: '2026 · 暑假'
  },
  {
    id: 20,
    src: 'assets/ride-photos/ride-20.jpg',
    title: '环海南岛骑行 20',
    description: '环海南岛骑行记录 · 2026 年暑假',
    date: '2026 · 暑假'
  },
  {
    id: 21,
    src: 'assets/ride-photos/ride-21.jpg',
    title: '环海南岛骑行 21',
    description: '环海南岛骑行记录 · 2026 年暑假',
    date: '2026 · 暑假'
  },
  {
    id: 22,
    src: 'assets/ride-photos/ride-22.jpg',
    title: '环海南岛骑行 22',
    description: '环海南岛骑行记录 · 2026 年暑假',
    date: '2026 · 暑假'
  },
  {
    id: 23,
    src: 'assets/ride-photos/ride-23.jpg',
    title: '环海南岛骑行 23',
    description: '环海南岛骑行记录 · 2026 年暑假',
    date: '2026 · 暑假'
  },
  {
    id: 24,
    src: 'assets/ride-photos/ride-24.jpg',
    title: '环海南岛骑行 24',
    description: '环海南岛骑行记录 · 2026 年暑假',
    date: '2026 · 暑假'
  },
  {
    id: 25,
    src: 'assets/ride-photos/ride-25.jpg',
    title: '环海南岛骑行 25',
    description: '环海南岛骑行记录 · 2026 年暑假',
    date: '2026 · 暑假'
  },
  {
    id: 26,
    src: 'assets/ride-photos/ride-26.jpg',
    title: '环海南岛骑行 26',
    description: '环海南岛骑行记录 · 2026 年暑假',
    date: '2026 · 暑假'
  },
  {
    id: 27,
    src: 'assets/ride-photos/ride-27.jpg',
    title: '环海南岛骑行 27',
    description: '环海南岛骑行记录 · 2026 年暑假',
    date: '2026 · 暑假'
  },
  {
    id: 28,
    src: 'assets/ride-photos/ride-28.jpg',
    title: '环海南岛骑行 28',
    description: '环海南岛骑行记录 · 2026 年暑假',
    date: '2026 · 暑假'
  }
];

window.cyclingItems = [
  {
    id: 'ep01',
    src: 'assets/videos/ride-2.mp4',
    label: 'ep01',
    title: '环海南岛骑行 · ep01',
    description: '环海南岛骑行记录 · 2026 年暑假',
    date: '2026 · 暑假'
  },
  {
    id: 'ep02',
    src: 'assets/videos/ride-1.mp4',
    poster: 'assets/videos/ep02-poster.jpg',
    label: 'ep02',
    title: '环海南岛骑行 · ep02',
    description: '环海南岛骑行记录 · 2026 年暑假',
    date: '2026 · 暑假'
  },
  {
    id: 'goodhan',
    src: 'assets/videos/ride-3.mp4',
    label: '好汉坡放坡',
    title: '环海南岛骑行 · 好汉坡放坡',
    description: '环海南岛骑行记录 · 2026 年暑假',
    date: '2026 · 暑假'
  }
];

/* 分组后的视图数据：首页两个入口卡与两个浮层都从这里取，避免到处硬编码路径 */
window.SITE_MEDIA = {
  gallery: {
    kicker: 'VISUAL ARCHIVE · 我的图库',
    title: '环海南岛骑行照片',
    cardTitle: '我的图库',
    cardDesc: '环海南岛骑行 · 28 张照片',
    cardCta: 'View Gallery',
    total: 28,
    items: window.galleryItems
  },
  cycling: {
    kicker: 'CYCLING JOURNEY · 骑行视频',
    title: '环岛骑行原片',
    cardTitle: '骑行视频',
    cardDesc: '环岛原片 · 3 段 · 可全屏播放',
    cardCta: 'Watch Video',
    items: window.cyclingItems
  }
};
