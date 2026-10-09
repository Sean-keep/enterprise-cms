import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/lib/password'

/**
 * 初始数据。
 *
 * **必须幂等**：compose 每次起都会跑一遍，重复执行不能报错也不能造重复数据。
 * 只做 upsert，不做「先清后插」—— 那会让运营已有的内容在重启时消失。
 */
const db = new PrismaClient()

const now = new Date()

async function seedUsers() {
  // 默认账号是骨架用的，生产部署第一件事就是改密码
  const adminHash = await hashPassword('admin12345')
  const editorHash = await hashPassword('editor12345')

  await db.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      passwordHash: adminHash,
      name: '管理员',
      role: 'admin',
    },
  })
  await db.user.upsert({
    where: { email: 'editor@example.com' },
    update: {},
    create: {
      email: 'editor@example.com',
      passwordHash: editorHash,
      name: '编辑',
      role: 'editor',
    },
  })
}

async function seedSettings() {
  await db.siteSetting.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      siteName: '示例科技',
      tagline: '让复杂的事变简单',
      contactEmail: 'contact@example.com',
      contactPhone: '400-000-0000',
      contactAddress: '北京市海淀区示例大厦 10 层',
      icpBeian: '京ICP备00000000号',
      footerText: '© 2026 示例科技 版权所有',
    },
  })
}

async function seedPages() {
  const admin = await db.user.findUnique({ where: { email: 'admin@example.com' } })

  // ── 首页 ──
  await db.page.upsert({
    where: { slug: 'home' },
    update: {},
    create: {
      slug: 'home',
      template: 'home',
      title: '首页',
      status: 'published',
      publishedAt: now,
      createdBy: admin?.id,
      meta: JSON.stringify({
        title: '示例科技 —— 让复杂的事变简单',
        description: '示例科技是一家专注于企业数字化的技术公司，提供产品、服务与行业解决方案。',
        keywords: '企业数字化,解决方案',
      }),
      content: JSON.stringify({
        hero: {
          title: '让复杂的事变简单',
          subtitle: '我们用技术把繁琐的流程变成一件顺手的小事。',
          ctaText: '了解我们的产品',
          ctaUrl: '/products',
          cta2Text: '联系我们',
          cta2Url: '/contact',
        },
        introHtml: '<p>示例科技成立于 2015 年，服务过 200+ 企业客户。我们相信好的技术应该是隐形的。</p>',
        features: [
          { icon: 'zap', title: '上线快', description: '标准实施周期 2 周，不拖业务的后腿。' },
          { icon: 'shield', title: '安全合规', description: '数据本地化部署，通过等保三级。' },
          { icon: 'users', title: '服务到人', description: '每个客户配专属实施顾问，不是工单队列。' },
        ],
        showProducts: true,
        productLimit: 6,
        showNews: true,
        newsLimit: 6,
        partnersTitle: '他们选择了我们',
        partners: [{ name: '示例集团', url: 'https://example.com' }],
      }),
    },
  })

  // ── 关于我们 ──
  await db.page.upsert({
    where: { slug: 'about' },
    update: {},
    create: {
      slug: 'about',
      template: 'about',
      title: '关于我们',
      status: 'published',
      publishedAt: now,
      createdBy: admin?.id,
      meta: JSON.stringify({ title: '关于我们 - 示例科技', description: '了解示例科技的发展历程与团队。' }),
      content: JSON.stringify({
        hero: { title: '关于我们', subtitle: '一群相信技术应该为人服务的人。' },
        introHtml: '<p>我们是一支 60 人的团队，分布在三个城市。</p>',
        storyHtml: '<p>公司从一间小办公室起步，到今天服务 200+ 客户。</p>',
        stats: [
          { value: '200+', label: '服务客户' },
          { value: '2015', label: '成立年份' },
          { value: '60', label: '团队规模' },
        ],
        values: [
          { title: '说人话', description: '不把简单的事说复杂。' },
          { title: '做实事', description: '少开会，多交付。' },
        ],
        timeline: [
          { year: '2015', title: '公司成立', description: '三个人，一间办公室。' },
          { year: '2019', title: '完成 A 轮', description: '团队扩到 30 人。' },
          { year: '2024', title: '服务 200+ 客户', description: '产品线覆盖三大行业。' },
        ],
      }),
    },
  })

  // ── 联系我们 ──
  await db.page.upsert({
    where: { slug: 'contact' },
    update: {},
    create: {
      slug: 'contact',
      template: 'contact',
      title: '联系我们',
      status: 'published',
      publishedAt: now,
      createdBy: admin?.id,
      meta: JSON.stringify({ title: '联系我们 - 示例科技' }),
      content: JSON.stringify({
        hero: { title: '联系我们', subtitle: '有想法？说说看。' },
        email: 'contact@example.com',
        phone: '400-000-0000',
        address: '北京市海淀区示例大厦 10 层',
        hours: '工作日 9:00 - 18:00',
        showForm: true,
        formIntro: '填写下面的表单，我们会在一个工作日内回复。',
      }),
    },
  })

  // ── 自定义页 ──
  await db.page.upsert({
    where: { slug: 'privacy' },
    update: {},
    create: {
      slug: 'privacy',
      template: 'generic',
      title: '隐私政策',
      status: 'published',
      publishedAt: now,
      createdBy: admin?.id,
      meta: JSON.stringify({ title: '隐私政策 - 示例科技' }),
      content: JSON.stringify({
        bodyHtml: '<p>我们仅收集为提供服务所必需的信息。</p><p>不会向第三方出售您的个人信息。</p>',
      }),
    },
  })
}

async function seedMenus() {
  const home = await db.page.findUnique({ where: { slug: 'home' } })
  const about = await db.page.findUnique({ where: { slug: 'about' } })
  const contact = await db.page.findUnique({ where: { slug: 'contact' } })
  const privacy = await db.page.findUnique({ where: { slug: 'privacy' } })

  const main = await db.menu.upsert({
    where: { key: 'main' },
    update: {},
    create: { key: 'main', name: '主导航' },
  })
  const footer = await db.menu.upsert({
    where: { key: 'footer' },
    update: {},
    create: { key: 'footer', name: '页脚导航' },
  })

  // 菜单项用固定 id 做 upsert，保证重复 seed 不会堆出两遍
  const items = [
    { id: 'mi-home', menuId: main.id, label: '首页', linkType: 'page', pageId: home?.id, sortOrder: 0 },
    { id: 'mi-products', menuId: main.id, label: '产品与服务', linkType: 'url', url: '/products', sortOrder: 1 },
    { id: 'mi-news', menuId: main.id, label: '新闻动态', linkType: 'url', url: '/news', sortOrder: 2 },
    { id: 'mi-about', menuId: main.id, label: '关于我们', linkType: 'page', pageId: about?.id, sortOrder: 3 },
    { id: 'mi-contact', menuId: main.id, label: '联系我们', linkType: 'page', pageId: contact?.id, sortOrder: 4 },
    { id: 'mi-f-privacy', menuId: footer.id, label: '隐私政策', linkType: 'page', pageId: privacy?.id, sortOrder: 0 },
    { id: 'mi-f-contact', menuId: footer.id, label: '联系我们', linkType: 'page', pageId: contact?.id, sortOrder: 1 },
  ]

  for (const it of items) {
    await db.menuItem.upsert({
      where: { id: it.id },
      update: { menuId: it.menuId, label: it.label, linkType: it.linkType, pageId: it.pageId, url: it.url, sortOrder: it.sortOrder },
      create: it,
    })
  }
}

async function seedPosts() {
  const admin = await db.user.findUnique({ where: { email: 'admin@example.com' } })
  const cat = await db.postCategory.upsert({
    where: { slug: 'company-news' },
    update: {},
    create: { slug: 'company-news', name: '公司新闻', sortOrder: 0 },
  })

  const samples = [
    {
      slug: 'welcome',
      title: '示例科技官网正式上线',
      summary: '全新的官网正式与大家见面。',
      body: '<p>经过一段时间的筹备，示例科技官网今天正式上线。</p><p>我们会在这里持续分享产品动态与行业观察。</p>',
    },
    {
      slug: 'product-release',
      title: '新一代数据平台发布',
      summary: '性能提升 3 倍，部署时间缩短到 2 周。',
      body: '<p>新一代数据平台正式发布，在性能和易用性上都有显著提升。</p>',
    },
  ]

  for (const s of samples) {
    await db.post.upsert({
      where: { slug: s.slug },
      update: {},
      create: {
        ...s,
        categoryId: cat.id,
        status: 'published',
        publishedAt: now,
        isFeatured: s.slug === 'welcome',
        createdBy: admin?.id,
        meta: JSON.stringify({ title: `${s.title} - 示例科技` }),
      },
    })
  }
}

async function seedProducts() {
  const admin = await db.user.findUnique({ where: { email: 'admin@example.com' } })
  const cat = await db.productCategory.upsert({
    where: { slug: 'platform' },
    update: {},
    create: { slug: 'platform', name: '平台产品', sortOrder: 0 },
  })
  const svcCat = await db.productCategory.upsert({
    where: { slug: 'services' },
    update: {},
    create: { slug: 'services', name: '专业服务', sortOrder: 1 },
  })

  await db.product.upsert({
    where: { slug: 'data-platform' },
    update: {},
    create: {
      slug: 'data-platform',
      kind: 'product',
      title: '企业数据平台',
      subtitle: '一个平台管住所有数据',
      summary: '从数据采集到分析看板的完整链路。',
      body: '<p>企业数据平台帮助企业统一管理、治理并使用数据资产。</p>',
      categoryId: cat.id,
      isFeatured: true,
      sortOrder: 0,
      highlights: JSON.stringify(['开箱即用的 50+ 数据源', '可视化建模', '细粒度权限']),
      status: 'published',
      publishedAt: now,
      createdBy: admin?.id,
    },
  })

  await db.product.upsert({
    where: { slug: 'implementation' },
    update: {},
    create: {
      slug: 'implementation',
      kind: 'service',
      title: '实施与咨询',
      subtitle: '从蓝图到上线',
      summary: '专属顾问团队，两周完成标准实施。',
      body: '<p>我们提供从业务梳理到系统上线的全流程服务。</p>',
      categoryId: svcCat.id,
      isFeatured: true,
      sortOrder: 1,
      highlights: JSON.stringify(['专属实施顾问', '标准周期 2 周', '上线后 3 个月陪跑']),
      status: 'published',
      publishedAt: now,
      createdBy: admin?.id,
    },
  })

  await db.product.upsert({
    where: { slug: 'case-manufacturing' },
    update: {},
    create: {
      slug: 'case-manufacturing',
      kind: 'case',
      title: '某制造集团数字化转型',
      subtitle: '生产效率提升 18%',
      summary: '覆盖 12 个工厂的数据治理与生产看板。',
      body: '<p>通过统一数据平台，把 12 个工厂的生产数据打通。</p>',
      categoryId: cat.id,
      isFeatured: false,
      sortOrder: 2,
      highlights: JSON.stringify(['12 个工厂', '效率 +18%']),
      clientName: '某制造集团',
      industry: '制造业',
      status: 'published',
      publishedAt: now,
      createdBy: admin?.id,
    },
  })
}

async function main() {
  console.log('→ 写入初始数据…')
  await seedUsers()
  await seedSettings()
  await seedPages()
  await seedMenus()
  await seedPosts()
  await seedProducts()
  console.log('✓ 完成')
  console.log('')
  console.log('  后台账号：admin@example.com / admin12345')
  console.log('  编辑账号：editor@example.com / editor12345')
  console.log('  （生产部署请立刻改掉）')
}

main()
  .catch((e) => {
    console.error('seed 失败：', e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
