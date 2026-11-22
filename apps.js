/**
 * OriginOS 7 — Window App Views
 * - Settings app: 1:1 Traced UI matching Image #2 + official OriginOS 7 SVG/Banner + Vivo X300 Ultra
 * - All other apps: Pure white background with "none" centered
 */

(function (global) {
  'use strict';

  const OFFICIAL_ORIGINOS7_SVG = `
    <svg class="origin-banner-svg" viewBox="0 0 615 114" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="OriginOS 7">
      <path fill-rule="evenodd" clip-rule="evenodd" d="M213.35 113.447C194.764 113.447 179.283 102.152 175.863 87.1661H195.709C198.769 92.3413 205.519 95.8964 213.35 95.8964C221.18 95.8964 227.93 92.3413 230.99 87.1211H250.836C247.371 102.152 231.89 113.447 213.35 113.447Z" fill="#E6223F"/>
      <path d="M281.572 2.69531H262.807V80.0982H281.572V2.69531Z" fill="white"/>
      <path d="M109.981 7.56029L107.64 2.79011H91.2148V80.148H109.981V38.4765C110.161 26.866 119.656 17.5507 131.266 17.5507H135.632V0H129.376C122.176 0 115.246 2.7001 109.981 7.56029Z" fill="white"/>
      <path d="M373.107 38.52V80.1914H354.341V38.88C354.341 27.2696 345.026 17.7742 333.415 17.5942H332.74C321.175 17.5942 311.815 26.9545 311.815 38.52V80.1914H292.959V2.83363H309.475L311.77 7.55879C318.385 2.65363 326.395 -0.00147285 334.585 0.0435316C355.826 -0.00147285 373.062 17.2342 373.107 38.52Z" fill="white"/>
      <path d="M162.724 2.74609H143.958V80.149H162.724V2.74609Z" fill="white"/>
      <path d="M41.4872 0.0429688C17.8614 0.0429688 -0.994371 19.7537 0.0406647 43.3346C0.940698 64.4854 18.2664 81.9461 39.3722 82.9811C62.6829 84.1511 82.3936 65.9255 82.9786 42.6146C83.5637 19.2587 64.8429 0.0429688 41.4872 0.0429688ZM41.4872 65.4304C28.9768 65.4304 18.8514 54.72 18.8514 41.5345C18.8514 28.349 28.9768 17.5936 41.4872 17.5936C53.9975 17.5936 64.1229 28.304 64.1229 41.4895C64.1229 54.675 53.9975 65.4304 41.4872 65.4304Z" fill="white"/>
      <path d="M235.265 2.83307L233.06 7.42325C226.579 2.65306 218.704 0.0429688 210.649 0.0429688C188.958 0.0429688 171.362 18.5837 171.362 41.5345C171.362 64.4854 188.958 83.0261 210.649 83.0261C218.704 83.0261 226.489 80.461 232.97 75.6908V80.101H251.825V2.78808L235.265 2.83307ZM211.594 65.4304C199.803 65.4304 190.218 54.72 190.218 41.5345C190.218 28.349 199.803 17.5936 211.594 17.5936C223.384 17.5936 232.97 28.304 232.97 41.4895C232.97 54.675 223.384 65.4304 211.594 65.4304Z" fill="white"/>
      <path d="M423.734 0.0429688C404.338 0.0429688 386.968 13.4085 386.968 41.5345C386.968 68.9856 404.383 83.0261 423.734 83.0261C443.13 83.0261 460.501 68.9856 460.501 41.5345C460.501 13.3635 443.085 0.0429688 423.734 0.0429688ZM423.734 76.7259C406.814 76.7259 394.483 63.7654 394.483 41.5345C394.483 18.8537 406.544 6.2982 423.734 6.2982C440.925 6.2982 452.985 18.8537 452.985 41.5345C452.94 63.7654 440.61 76.7259 423.734 76.7259Z" fill="white"/>
      <path d="M529.352 50.6687C527.597 48.0586 525.257 45.8985 522.512 44.3685C519.542 42.7035 516.302 41.4435 513.017 40.5884C509.551 39.6884 505.951 38.8783 502.261 38.2033C498.571 37.5283 495.061 36.8532 491.551 36.1332C488.401 35.5032 485.296 34.5132 482.325 33.2531C479.85 32.2181 477.69 30.6431 475.935 28.663C474.315 26.7729 473.55 24.3428 473.55 21.3727C473.55 18.2676 474.27 15.7024 475.71 13.6774C477.195 11.6073 479.085 9.89723 481.335 8.68218C483.721 7.42214 486.241 6.56715 488.896 6.07208C494.971 4.90204 501.271 5.08205 507.301 6.56715C510.317 7.28718 513.152 8.54718 515.717 10.2572C520.352 13.4074 523.232 18.5826 523.457 24.1628L523.502 24.5228L523.547 25.3778H529.937L529.847 24.3878L529.802 23.9378C529.487 20.0226 528.542 16.6025 526.922 13.7224L526.787 13.4524L526.562 13.0924C524.807 10.1222 522.422 7.64714 519.587 5.75707C516.392 3.68702 512.882 2.24696 509.191 1.43694C505.051 0.491901 500.776 -0.00312249 496.501 0.041882C493.036 0.041882 489.571 0.446895 486.196 1.21193C482.865 1.93195 479.67 3.147 476.745 4.90204C473.955 6.5221 471.615 8.81723 469.86 11.5623C468.06 14.3074 467.16 17.6376 467.16 21.4627C467.16 25.2879 468.06 28.4829 469.815 30.958C471.57 33.4331 473.91 35.4582 476.565 36.9433C479.58 38.5184 482.776 39.7334 486.061 40.4984C489.571 41.3534 493.171 42.1635 496.771 42.8385C500.461 43.4685 504.016 44.1886 507.481 44.9536C510.677 45.6285 513.782 46.6635 516.707 48.0136C519.227 49.0936 521.432 50.8037 523.187 52.9188C524.762 54.8988 525.572 57.4189 525.572 60.5691C525.572 63.8992 524.762 66.5993 523.232 68.7594C521.657 70.9644 519.632 72.7645 517.292 74.0696C514.862 75.4646 512.162 76.4547 509.416 76.9497C506.761 77.4897 504.016 77.8047 501.271 77.8047C497.221 77.8497 493.216 77.3997 489.256 76.5447C485.746 75.8246 482.37 74.4746 479.355 72.4945C476.655 70.6944 474.405 68.2643 472.875 65.4292C471.435 62.7291 470.76 59.399 470.895 55.4839V55.1688L470.94 54.2238H464.55V55.5739C464.595 60.254 465.45 64.2592 467.16 67.5893L467.295 67.8593L467.475 68.2643C469.365 71.6395 471.975 74.5196 475.17 76.6797C478.725 79.0197 482.73 80.6848 486.916 81.5848C491.596 82.5749 496.366 83.0699 501.181 83.0249C504.646 83.0249 508.111 82.6199 511.532 81.8999C515.042 81.1798 518.372 79.8748 521.432 78.0747C524.357 76.3196 526.922 73.9346 528.857 71.0995C530.837 68.2193 531.827 64.6642 531.827 60.4791C531.827 56.5639 530.972 53.2788 529.217 50.6687H529.352Z" fill="white"/>
      <path d="M614.398 12.0031L587.168 81.6401H565.642L595.025 17.8151H557.569V1.34766H614.398V12.0031Z" fill="white"/>
    </svg>
  `;

  const INFO_CIRCLE_SVG = `
    <svg class="spec-info-svg" viewBox="0 0 16 16" width="12.5" height="12.5" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.1" stroke="currentColor" stroke-width="1.35"/>
      <line x1="8" y1="7.1" x2="8" y2="11.2" stroke="currentColor" stroke-width="1.35" stroke-linecap="round"/>
      <circle cx="8" cy="4.9" r="0.85" fill="currentColor"/>
    </svg>
  `;

  function renderNoneSurface() {
    return `
      <div class="app-surface app-none-surface">
        <span class="app-none-text">none</span>
      </div>
    `;
  }

  const APP_CATALOG = [
    {
      id: 'settings',
      name: 'Settings',
      icon: './assets/icons/settings.png',
      theme: 'light',
      render() {
        return `
          <div class="app-surface app-settings-info">
            <div class="settings-info-header">
              <svg class="settings-back-icon" viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M12.5 4.2L6.8 10l5.7 5.8"/>
              </svg>
              <span class="settings-info-title">About phone</span>
            </div>

            <div class="origin-banner-card">
              <img src="./assets/originos7_banner_bg.jpg" alt="" class="origin-banner-bg" draggable="false" />
              <div class="origin-banner-logo-wrap">
                ${OFFICIAL_ORIGINOS7_SVG}
              </div>
            </div>

            <div class="device-model-hero">vivo X300 Ultra</div>
            <div class="device-divider"></div>

            <div class="device-specs-list">
              <div class="spec-row">
                <span class="spec-val">vivo X300 Ultra</span>
                <span class="spec-label-group">
                  <span class="spec-label">Device name</span>
                  <svg class="spec-chevron-svg" viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M4.2 2.4L7.8 6 4.2 9.6"/>
                  </svg>
                </span>
              </div>

              <div class="spec-row spec-row-multiline">
                <span class="spec-val">4.6 GHz Snapdragon® 8 Elite Gen 5 Mobile Platform <span style="white-space:nowrap">Octa-core</span></span>
                <span class="spec-label-group">
                  <span class="spec-label">Processor</span>
                  <span class="spec-red-bar" aria-hidden="true"></span>
                </span>
              </div>

              <div class="spec-row">
                <span class="spec-val">512 GB</span>
                <span class="spec-label-group">
                  <span class="spec-label">Phone storage</span>
                  <span class="spec-red-bar" aria-hidden="true"></span>
                </span>
              </div>

              <div class="spec-row">
                <span class="spec-val">16 GB + 32 GB</span>
                ${INFO_CIRCLE_SVG}
                <span class="spec-label-group">
                  <span class="spec-label">RAM</span>
                  <span class="spec-red-bar" aria-hidden="true"></span>
                </span>
              </div>

              <div class="spec-row">
                <span class="spec-val">55 GB</span>
                ${INFO_CIRCLE_SVG}
                <span class="spec-label-group">
                  <span class="spec-label">Storage compression</span>
                  <span class="spec-red-bar" aria-hidden="true"></span>
                </span>
              </div>

              <div class="spec-row">
                <span class="spec-val">Professional Imaging Chip VS1+</span>
                ${INFO_CIRCLE_SVG}
                <span class="spec-label-group">
                  <span class="spec-label">Chip</span>
                  <span class="spec-red-bar" aria-hidden="true"></span>
                </span>
              </div>

              <div class="spec-row">
                <span class="spec-val">6510 mAh</span>
                <span class="spec-label-group">
                  <span class="spec-label">Battery capacity</span>
                  <span class="spec-red-bar" aria-hidden="true"></span>
                </span>
              </div>
            </div>
          </div>
        `;
      }
    },
    {
      id: 'music',
      name: 'Origin Music',
      icon: './assets/icons/music.png',
      theme: 'light',
      render: renderNoneSurface
    },
    {
      id: 'gallery',
      name: 'Albums',
      icon: './assets/icons/gallery.png',
      theme: 'light',
      render: renderNoneSurface
    },
    {
      id: 'notes',
      name: 'Notes',
      icon: './assets/icons/notes.png',
      theme: 'light',
      render: renderNoneSurface
    },
    {
      id: 'weather',
      name: 'Weather',
      icon: './assets/icons/weather.png',
      theme: 'light',
      render: renderNoneSurface
    },
    {
      id: 'calculator',
      name: 'Calculator',
      icon: './assets/icons/calculator.png',
      theme: 'light',
      render: renderNoneSurface
    },
    {
      id: 'files',
      name: 'Files',
      icon: './assets/icons/files.png',
      theme: 'light',
      render: renderNoneSurface
    },
    {
      id: 'browser',
      name: 'Browser',
      icon: './assets/icons/browser.png',
      theme: 'light',
      render: renderNoneSurface
    }
  ];

  global.WorkbenchApps = {
    APP_CATALOG,
    getAppById(id) {
      return APP_CATALOG.find((a) => a.id === id) || APP_CATALOG[0];
    }
  };
})(window);
