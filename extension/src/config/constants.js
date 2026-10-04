export const ERP_CONFIG = {
    BASE_URL: 'https://erp.iitkgp.ac.in',
    HOMEPAGE_URL: 'https://erp.iitkgp.ac.in/IIT_ERP3/',
    LOGIN_URL: 'https://erp.iitkgp.ac.in/SSOAdministration/auth.htm',
    SECURITY_URL: 'https://erp.iitkgp.ac.in/SSOAdministration/getSecurityQues.htm',
    OTP_URL: 'https://erp.iitkgp.ac.in/SSOAdministration/getEmilOTP.htm',
    VERIFY_URL: 'https://erp.iitkgp.ac.in/SSOAdministration/auth.htm',
    WELCOMEPAGE_URL: 'https://erp.iitkgp.ac.in/IIT_ERP3/welcome.jsp',
    DASHBOARD_URL:   'https://erp.iitkgp.ac.in/IIT_ERP3/home.jsp'
};

export const GMAIL_CONFIG = {
    SCOPES: [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/gmail.readonly',
        'openid'
    ],
    DISCOVERY_DOC: 'https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest',
    OTP_SEARCH_QUERY: 'from:erpkgp@adm.iitkgp.ac.in'
};

export const STORAGE_KEYS = {
    USER_DATA: 'user_data',
    GMAIL_DATA: 'gmail_data',
    LAST_LOGIN: 'last_login',
    ERP_SESSION: 'erp_session'
};

export const UI_CONFIG = {
    WINDOW_WIDTH: 480,
    WINDOW_HEIGHT: 800,
    ANIMATION_DURATION: 300,
    OTP_TIMEOUT: 300000
};


export const GITHUB_CONFIG = {
    REPOSITORY_URL: 'https://github.com/iamrknain/quickerp',
    ISSUES_URL: 'https://github.com/iamrknain/quickerp/issues',
    DISCUSSIONS_URL: 'https://github.com/iamrknain/quickerp/discussions'
};

export const SITE_CONFIG = {
    SITE_URL:'https://quickerp.rknain.com', // 'http://localhost:3000',  // 
    EXTENSION_URL: 'https://chromewebstore.google.com/detail/quickerp/gafmfinhhfaocnchccamogkeemjfboin',
    CONTACT_EMAIL: 'quickerp@rknain.com',
    HOME_PATH: '',
    CONTACT_PATH: '/contact',
    FAQS_PATH: '/faqs',
    PRIVACY_PATH: '/privacy',
    OAUTH_SETUP_PATH: '/blogs/oauth',
    EXTENSION_SETUP_PATH: '/blogs/setup'
};

export const ERROR_MESSAGES = {
    INVALID_CREDENTIALS: 'Invalid roll number or password',
    CAPTCHA_FAILED: 'Captcha verification failed',
    OTP_TIMEOUT: 'OTP timeout - please try again',
    NETWORK_ERROR: 'Network connection failed',
    GMAIL_AUTH_FAILED: 'Gmail authentication failed'
};
