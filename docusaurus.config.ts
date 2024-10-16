import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'CCX Documentation',
  tagline: '',
  favicon: 'img/favicon.ico',

  // Set the production url of your site here
  url: 'https://www.github.com',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/ccx-docs',

  plugins: [require.resolve("@cmfcmf/docusaurus-search-local")],
  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'severalnines', // Usually your GitHub org/user name.
  projectName: 'ccx-docs', // Usually your repo name.
  deploymentBranch: 'gh-pages',

  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          //editUrl:
          //  'https://github.com/ebook/docusaurus/tree/main/packages/create-docusaurus/templates/shared/',
        },
/*
        blog: {
          showReadingTime: true,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/facebook/docusaurus/tree/main/packages/create-docusaurus/templates/shared/',
          // Useful options to enforce blogging best practices
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'warn',
        },*/
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // Replace with your project's social card
    image: 'img/docusaurus-social-card.jpg',
    navbar: {
      title: 'Severalnines CCX documentation',
      logo: {
        alt: 'CCX Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'doc',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Admin Guide',
          docId: 'admin/Installation/Index',
        },
        {
          type: 'doc',
          sidebarId: 'tutorialSidebar2',
          position: 'left',
          label: 'User Guide',
          docId: 'user/Index',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Introduction',
              to: '/docs/user',
            },
            {
              label: 'Admin Guide',
              to: '/docs/admin/',
            },
            {
              label: 'User Guide',
              to: '/docs/user',
            },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'Stack Overflow',
              href: 'https://stackoverflow.com/questions/tagged/severalnines',
            },
            {
              label: 'Twitter',
              href: 'https://twitter.com/severalnines',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'Blog',
              to: 'https://severalnines.com/blog/',
            },
            {
              label: 'GitHub',
              href: 'https://github.com/severalnines',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Severalnines AB. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
