export const extensionInfo = {
  latestVersion: "1.5.0",
  minimumVersion: "1.5.0",
  releaseDate: "2026-10-04",
  downloadUrl: "https://chromewebstore.google.com/detail/quickerp/gafmfinhhfaocnchccamogkeemjfboin",
  changelog: {
    "1.5.0": {
      date: "2026-10-04",
      changes: [
        "Fixed compatibility with recent ERP system breaking changes",
        "Improved OTP email filtering to prevent stale OTP reuse",
        "Improved keyboard shortcut reliability (Ctrl+Q / MacCtrl+Q)",
        "Bug fixes and code cleanup"
      ],
      breaking: true,
      critical: true
    },
    "1.4.0": {
      date: "2026-01-31",
      changes: [
        "Updated to open in sidepanel"
      ],
      breaking: false,
      critical: false
    }
  },
  notifications: [
    {
      id: "upcoming-update-oct-7",
      type: "error",
      title: "Breaking Changes Alert",
      message: "The IIT KGP ERP system was recently updated with breaking changes. Our next update on October 7th will fix compatibility issues so everything works smoothly again.",
      buttons: [],
      dismissible: true,
      priority: "high",
      validFrom: "2026-10-04",
      validUntil: "2026-10-08T00:00:00"
    },
    {
      id: "placement-season-2026",
      type: "success",
      title: "Best of Luck for Placements! 🎓",
      message: "Wishing all my friends participating in the placement season the very best! May you get the offers you deserve. You've got this!",
      buttons: [],
      dismissible: true,
      priority: "medium",
      validUntil: "2026-12-31T23:59:59"
    },
    {
      id: "chrome-store-review",
      type: "info",
      title: "Enjoying QuickERP?",
      message: "Help us improve by leaving a review on the Chrome Web Store! Your feedback helps other users discover QuickERP.",
      buttons: [
        {
          text: "Rate on Chrome Store",
          link: "https://chromewebstore.google.com/detail/quickerp/gafmfinhhfaocnchccamogkeemjfboin/reviews",
          type: "primary"
        }
      ],
      dismissible: true,
      priority: "low",
      validFrom: "2024-01-01",
      validUntil: "2031-12-31"
    }
  ],
  features: {
    autoOTP: true,
    sessionManagement: true,
    securityQuestions: true,
    gmailIntegration: true
  },
  support: {
    email: "quickerp@rknain.com",
    github: "https://github.com/iamrknain/quickerp",
    website: "https://quickerp.rknain.com"
  }
};
