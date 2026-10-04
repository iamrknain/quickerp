import { ERPApiService } from '../services/ERPApiService.js';
import { ERP_CONFIG } from '../config/constants.js';

export class DashboardController {
    constructor(app) {
        this.app = app;
    }

    async init() {
        // Controller initialization
    }

    async onScreenLoad() {
        await this.checkPrivacyPolicy();

        await this.loadDashboardData();
        await this.checkERPSession();
        await this.checkVersion();
        await this.checkShortcutBanner();
        this.setupEventListeners();
    }

    async checkVersion() {
        try {
            const { VersionService } = await import('../services/VersionService.js');
            const versionInfo = await VersionService.checkVersion();

            // Update version display
            const versionElement = document.getElementById('current-version');
            const statusElement = document.getElementById('version-status');
            if (versionElement) {
                versionElement.textContent = versionInfo.currentVersion;
            }

            if (statusElement && versionInfo.isOutdated) {
                const changelog = versionInfo.changelog;
                const isBreaking = changelog?.breaking || false;
                const isCritical = changelog?.critical || false;

                let badgeText = 'New update might be available';
                let badgeClass = 'version-status outdated';
                let tooltip = `New version ${versionInfo.latestVersion} available.`;

                if (isCritical || isBreaking) {
                    badgeClass = 'version-status critical';
                }

                statusElement.textContent = badgeText;
                statusElement.className = badgeClass;
                statusElement.title = tooltip;
                statusElement.style.cursor = 'default';
                // No click listener or link opening
            } else if (statusElement) {
                statusElement.textContent = '✓ Up to date';
                statusElement.className = 'version-status latest';
                statusElement.title = 'You are running the latest version';
            }
        } catch (error) {
            console.error('Version check failed:', error);
        }
    }

    async checkShortcutBanner() {
        const SHORTCUT_DISMISSED_KEY = 'shortcut_banner_dismissed';

        try {
            const result = await chrome.storage.local.get(SHORTCUT_DISMISSED_KEY);
            const isDismissed = result[SHORTCUT_DISMISSED_KEY] || false;

            const shortcutInfo = document.getElementById('shortcut-info');
            if (shortcutInfo) {
                if (isDismissed) {
                    shortcutInfo.classList.add('hidden');
                } else {
                    shortcutInfo.classList.remove('hidden');
                }
            }
        } catch (error) {
            console.error('Failed to check shortcut banner state:', error);
            // On error, show the banner by default
            const shortcutInfo = document.getElementById('shortcut-info');
            if (shortcutInfo) {
                shortcutInfo.classList.remove('hidden');
            }
        }
    }

    async dismissShortcutBanner() {
        const SHORTCUT_DISMISSED_KEY = 'shortcut_banner_dismissed';

        try {
            await chrome.storage.local.set({ [SHORTCUT_DISMISSED_KEY]: true });

            const shortcutInfo = document.getElementById('shortcut-info');
            if (shortcutInfo) {
                shortcutInfo.classList.add('hidden');
            }
        } catch (error) {
            console.error('Failed to dismiss shortcut banner:', error);
        }
    }

    async checkPrivacyPolicy() {
        try {
            const { PrivacyPolicyDialog } = await import('../window/dialogs/PrivacyPolicyDialog.js');

            const isRequired = await PrivacyPolicyDialog.isPrivacyPolicyRequired();
            if (isRequired) {
                const dialog = new PrivacyPolicyDialog(this.app);
                await dialog.show();
            }
        } catch (error) {
            console.error('Failed to check privacy policy:', error);
        }
    }

    async loadDashboardData() {
        const userInfo = this.app.getController('app').getUserInfo();

        document.getElementById('account-info').textContent =
            userInfo.rollNumber || 'Not configured';

        document.getElementById('gmail-info').textContent =
            userInfo.gmailConnected ? `Connected: ${userInfo.gmailEmail}` : 'Not connected';

        document.getElementById('last-login-info').textContent =
            this.app.getController('app').formatLastLogin(userInfo.lastLogin);

        this.updateStatusIndicator(userInfo.rollNumber && userInfo.gmailConnected);
    }

    updateStatusIndicator(isReady) {
        const statusDot = document.querySelector('.status-dot');
        const statusText = document.querySelector('.status-text');

        if (isReady) {
            statusDot.style.background = 'var(--success)';
            statusText.textContent = 'Ready';
        } else {
            statusDot.style.background = 'var(--warning)';
            statusText.textContent = 'Setup Required';
        }
    }

    updateStatusIndicatorText(text) {
        const statusText = document.querySelector('.status-text');
        const statusDot = document.querySelector('.status-dot');
        const btnStatus = document.querySelector('.btn-status');

        if (statusText) {
            statusText.textContent = text;
        }

        // Also update button status
        if (btnStatus) {
            btnStatus.textContent = text;
        }

        // Update dot color based on status
        if (statusDot) {
            if (text.includes('failed') || text.includes('expired')) {
                statusDot.style.background = 'var(--error, #ff4444)';
            } else if (text.includes('Checking') || text.includes('Validating')) {
                statusDot.style.background = 'var(--warning, #ffa500)';
            } else if (text.includes('active') || text.includes('Ready')) {
                statusDot.style.background = 'var(--success, #4CAF50)';
            } else {
                statusDot.style.background = 'var(--info, #2196F3)';
            }
        }
    }


    setupEventListeners() {
        const loginBtn = document.getElementById('login-btn');
        loginBtn?.addEventListener('click', () => this.startLogin());

        const cancelBtn = document.getElementById('cancel-login');
        cancelBtn?.addEventListener('click', () => this.cancelLogin());

        const useSessionBtn = document.getElementById('use-session-btn');
        useSessionBtn?.addEventListener('click', () => this.useLastSession());

        const clearSessionBtn = document.getElementById('clear-session-btn');
        clearSessionBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.clearSession();
        });

        const viewCredentialsBtn = document.getElementById('view-credentials-btn');
        viewCredentialsBtn?.addEventListener('click', async (e) => {
            e.preventDefault();
            await this.showERPCredentialsDialog();
        });

        // Setup collapsible links
        const linksHeader = document.getElementById('links-header');
        linksHeader?.addEventListener('click', () => this.toggleLinksSection());

        // Setup shortcut banner dismiss button
        const dismissBtn = document.getElementById('shortcut-dismiss');
        dismissBtn?.addEventListener('click', () => this.dismissShortcutBanner());
    }

    async startLogin() {

        try {
            const validation = await this.app.getController('app').isValidSetup();

            if (!validation.isValid) {
                if (validation.missingCredentials) {
                    this.app.showError('Please complete setup first');
                    this.app.navigateToScreen('setup');
                    return;
                }
                if (validation.missingGmail) {
                    this.app.showError('Please connect Gmail in settings');
                    this.app.navigateToScreen('settings');
                    return;
                }
            }

            this.app.showSuccess('Starting ERP login...');

            const loginCard = document.getElementById('login-card');
            const loginProgress = document.querySelector('.login-progress');

            if (loginCard) {
                loginCard.classList.remove('hidden');
            }
            if (loginProgress) {
                loginProgress.classList.remove('hidden');
            }

            const loginActions = document.querySelector('.login-actions');
            if (loginActions) {
                loginActions.classList.remove('hidden');
            }

            const result = await ERPApiService.performFullLogin(null, (step, data) => {
                if (step === 'polling') {
                    this.updatePollingStatus(data);
                } else {
                    this.updateDashboardProgress(step, typeof data === 'string' ? data : data.message || step);
                }
            });

            if (result && result.success) {
                const { CredentialService } = await import('../services/CredentialService.js');
                await CredentialService.saveERPSession({
                    sessionToken: result.sessionToken,
                    ssoToken: result.ssoToken,
                    cookies: result.cookies
                });

                this.updateDashboardProgress('completed', 'Login completed successfully');

                await this.app.getController('app').updateLastLogin();

                this.hideLoginProgress();

                // Refresh Quick Access card to show new session
                await this.checkERPSession();

                this.showERPAccessDialog(result);
            }
        } catch (error) {
            this.app.handleDetailedError(error);
            this.hideLoginProgress();
        }
    }

    cancelLogin() {
        this.hideLoginProgress();
        this.app.showSuccess('Login cancelled');
    }

    async checkERPSession() {
        try {
            // Show loading status
            this.updateStatusIndicatorText('Checking session...');

            const { CredentialService } = await import('../services/CredentialService.js');
            const session = await CredentialService.getERPSession();

            const quickAccessCard = document.getElementById('quick-access-card');
            const sessionTime = document.getElementById('session-time');
            const loginCardTitle = document.querySelector('.login-card .card-header h3');
            const loginBtn = document.getElementById('login-btn');
            const loginBtnText = loginBtn?.querySelector('.btn-text');
            const loginBtnIcon = loginBtn?.querySelector('.btn-icon');

            // Check if session exists and is valid via HTTP request
            if (session) {
                this.updateStatusIndicatorText('Validating session...');

                const isValid = await CredentialService.isERPSessionValid();

                if (isValid && quickAccessCard) {
                    const sessionDate = new Date(session.timestamp);

                    sessionTime.textContent = `Session from: ${sessionDate.toLocaleString()}`;
                    quickAccessCard.classList.remove('hidden');

                    if (loginCardTitle) {
                        loginCardTitle.textContent = 'ERP Login (Relogin)';
                    }
                    if (loginBtnText) {
                        loginBtnText.textContent = 'Relogin to ERP';
                    }
                    if (loginBtnIcon) {
                        loginBtnIcon.textContent = '🔄';
                    }

                    this.updateStatusIndicatorText('Session active');
                } else {
                    // Session exists but is invalid, clear it
                    this.updateStatusIndicatorText('Session expired, clearing...');
                    await CredentialService.clearERPSession();

                    if (quickAccessCard) {
                        quickAccessCard.classList.add('hidden');
                    }

                    if (loginCardTitle) {
                        loginCardTitle.textContent = 'ERP Login';
                    }
                    if (loginBtnText) {
                        loginBtnText.textContent = 'Login to ERP';
                    }
                    if (loginBtnIcon) {
                        loginBtnIcon.textContent = '🚀';
                    }

                    this.updateStatusIndicatorText('Ready for login');
                }
            } else {
                // No session found
                if (quickAccessCard) {
                    quickAccessCard.classList.add('hidden');
                }

                if (loginCardTitle) {
                    loginCardTitle.textContent = 'ERP Login';
                }
                if (loginBtnText) {
                    loginBtnText.textContent = 'Login to ERP';
                }
                if (loginBtnIcon) {
                    loginBtnIcon.textContent = '🚀';
                }

                this.updateStatusIndicatorText('Ready for login');
            }
        } catch (error) {
            console.error('Failed to check ERP session:', error);
            this.updateStatusIndicatorText('Session check failed');
            this.app.showError('Failed to check session status: ' + error.message);
        }
    }

    async useLastSession() {
        try {
            const { CredentialService } = await import('../services/CredentialService.js');
            const session = await CredentialService.getERPSession();

            if (!session) {
                this.app.showError('No valid session found');
                await this.checkERPSession(); // Refresh UI
                return;
            }

            this.app.showSuccess('Opening ERP with saved session...');

            await ERPApiService.openAuthenticatedERP(session);

        } catch (error) {
            console.error('Failed to use last session:', error);
            this.app.showError('Failed to use saved session: ' + error.message);
        }
    }

    async clearSession() {
        try {
            const confirmed = confirm('Clear saved ERP session? You will need to login again.');
            if (!confirmed) return;

            const { CredentialService } = await import('../services/CredentialService.js');
            await CredentialService.clearERPSession();

            await this.checkERPSession(); // Refresh UI
            this.app.showSuccess('Session cleared');
        } catch (error) {
            console.error('Failed to clear session:', error);
            this.app.showError('Failed to clear session');
        }
    }

    hideLoginProgress() {
        const loginProgress = document.querySelector('.login-progress');
        if (loginProgress) {
            loginProgress.classList.add('hidden');
        }

        const loginActions = document.querySelector('.login-actions');
        if (loginActions) {
            loginActions.classList.add('hidden');
        }
    }

    updatePollingStatus(data) {
        const pollingStatus = document.querySelector('.polling-status');
        const pollingMessage = document.getElementById('polling-message');
        const pollingTimer = document.getElementById('polling-timer');
        const pollingAttempts = document.getElementById('polling-attempts');
        const pollingError = document.getElementById('polling-error');

        if (!pollingStatus) return;

        pollingStatus.classList.remove('hidden');

        if (pollingMessage) {
            pollingMessage.textContent = data.message || 'Polling for OTP...';
        }

        if (pollingTimer) {
            let timerText = data.timer || '0:00';
            if (timerText === '0:0') {
                timerText = '0:00';
            }
            pollingTimer.textContent = timerText;
        }
        if (pollingAttempts) {
            pollingAttempts.textContent = `Attempt ${data.attempt || 1}/${data.maxAttempts || 10}`;
        }

        if (data.status === 'error' && pollingError) {
            pollingError.textContent = data.error || 'An error occurred';
            pollingError.classList.remove('hidden');
        } else if (pollingError) {
            pollingError.classList.add('hidden');
        }

        const pollingIcon = document.querySelector('.polling-icon');
        if (pollingIcon) {
            switch (data.status) {
                case 'searching':
                    pollingIcon.textContent = '🔍';
                    break;
                case 'extracting':
                    pollingIcon.textContent = '📧';
                    break;
                case 'verifying':
                    pollingIcon.textContent = '🔄';
                    break;
                case 'logging_in':
                    pollingIcon.textContent = '🚪';
                    break;
                case 'success':
                    pollingIcon.textContent = '✨';
                    break;
                case 'error':
                    pollingIcon.textContent = '❌';
                    break;
                case 'waiting':
                    pollingIcon.textContent = '⏳';
                    break;
                default:
                    pollingIcon.textContent = '⏳';
            }
        }
    }

    updateDashboardProgress(step, message) {
        const progressSteps = document.querySelectorAll('.progress-step');
        const progressFill = document.querySelector('.progress-fill');

        progressSteps.forEach((stepEl, index) => {
            const stepName = stepEl.dataset.step;
            stepEl.classList.remove('active', 'completed');

            if (stepName === step || step === 'completed') {
                if (step === 'completed') {
                    stepEl.classList.add('completed');
                } else {
                    stepEl.classList.add('active');
                }
            } else {
                const stepOrder = ['init', 'credentials', 'security', 'otp', 'login', 'completed'];
                const currentIndex = stepOrder.indexOf(step);
                const stepIndex = stepOrder.indexOf(stepName);

                if (stepIndex < currentIndex) {
                    stepEl.classList.add('completed');
                }
            }
        });

        if (progressFill) {
            const stepOrder = ['init', 'credentials', 'security', 'otp', 'login', 'completed'];
            const currentIndex = stepOrder.indexOf(step);
            const progress = ((currentIndex + 1) / stepOrder.length) * 100;
            progressFill.style.width = `${progress}%`;
        }

        // Hide polling status when not on OTP step
        if (step !== 'otp') {
            const pollingStatus = document.querySelector('.polling-status');
            if (pollingStatus) {
                pollingStatus.classList.add('hidden');
            }
        }
    }

    async showERPAccessDialog(result) {
        try {
            const { ERPSuccessDialog } = await import('../window/dialogs/ERPSuccessDialog.js');
            const dialog = new ERPSuccessDialog(this);
            await dialog.show(result);
        } catch (error) {
            console.error('Failed to show ERP success dialog:', error);
            this.app?.showError?.('Failed to load success dialog');
        }
    }

    async showERPCredentialsDialog() {
        try {
            // Check if we have an active ERP session first
            const { CredentialService } = await import('../services/CredentialService.js');
            const hasSession = await CredentialService.isERPSessionValid();

            if (!hasSession) {
                this.app.showError('No active ERP session found. Please login first.');
                return;
            }

            const { ERPCredentialsDialog } = await import('../window/dialogs/ERPCredentialsDialog.js');

            const dialog = new ERPCredentialsDialog(this.app);

            await dialog.show();
        } catch (error) {
            console.error('Failed to show ERP credentials dialog:', error);
            this.app.showError(`Failed to load ERP credentials: ${error.message}`);
        }
    }

    toggleLinksSection() {
        const linksContent = document.getElementById('links-content');
        const chevron = document.querySelector('.chevron');

        if (linksContent && chevron) {
            linksContent.classList.toggle('collapsed');
            chevron.classList.toggle('collapsed');
        }
    }

    async openERPPortal(result) {
        try {
            // The ERP session is maintained via browser cookies set during the fetch-based
            // login flow. Just open the homepage — the browser cookies handle auth.
            // NOTE: Passing ssoToken as a URL parameter does NOT work for IIT_ERP3/.
            const url = ERP_CONFIG.HOMEPAGE_URL;

            // Try to send message to background script to open new tab
            try {
                await chrome.runtime.sendMessage({
                    action: 'openTab',
                    url: url
                });
                this.app.showSuccess('ERP Portal opened in new tab');
                return;
            } catch (msgError) {
                // Fallback if background script communication fails
                window.open(url, '_blank');
                this.app.showSuccess('ERP Portal opened in new tab');
                return;
            }
        } catch (error) {
            console.warn('Failed to open ERP portal:', error);
            // Final fallback: try the direct homepage
            window.open(ERP_CONFIG.HOMEPAGE_URL, '_blank');
            this.app.showError('Opened ERP portal with basic URL due to error');
        }
    }
}
