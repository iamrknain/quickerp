import { CredentialService } from '../services/CredentialService.js';
import { GmailService } from '../services/GmailService.js';
import { StorageService } from '../services/StorageService.js';
import { ERPApiService } from '../services/ERPApiService.js';

export class SetupController {
    constructor(app) {
        this.app = app;
        this.currentStep = 1;
        this.SECURITY_QUESTIONS_COUNT = 3;
        this.userData = {};
    }

    async init() {
        // Controller initialization
    }

    async onScreenLoad() {
        await this.checkPrivacyPolicy();
        
        this.setupEventListeners();
        await this.loadStoredSetupData();
        await this.checkVersion();
        this.showStep(1);
    }

    async checkVersion() {
        try {
            const { VersionService } = await import('../services/VersionService.js');
            const versionInfo = await VersionService.checkVersion();
            
            const versionElement = document.getElementById('setup-version');
            const statusElement = document.getElementById('setup-version-status');
            
            if (versionElement) {
                versionElement.textContent = versionInfo.currentVersion;
            }
            
            if (statusElement && versionInfo.isOutdated) {
                const changelog = versionInfo.changelog;
                const isBreaking = changelog?.breaking || false;
                const isCritical = changelog?.critical || false;

                let badgeText = `⬆️ Update to v${versionInfo.latestVersion}`;
                let badgeClass = 'version-status outdated';
                let tooltip = `New version ${versionInfo.latestVersion} available. Click to view details.`;

                if (isCritical && isBreaking) {
                    badgeText = `⚠️ Critical + Breaking Update to v${versionInfo.latestVersion}`;
                    badgeClass = 'version-status critical';
                    tooltip = 'This update contains both critical and breaking changes. Click to view details.';
                } else if (isCritical) {
                    badgeText = `🔴 Critical Update to v${versionInfo.latestVersion}`;
                    badgeClass = 'version-status critical';
                    tooltip = 'Critical security update required.';
                } else if (isBreaking) {
                    badgeText = `⚠️ Breaking Changes in v${versionInfo.latestVersion}`;
                    badgeClass = 'version-status critical';
                    tooltip = 'This update contains breaking changes. Click to view details.';
                }

                statusElement.textContent = badgeText;
                statusElement.className = badgeClass;
                statusElement.title = tooltip;
                statusElement.style.cursor = 'pointer';
                statusElement.addEventListener('click', () => {
                    const updateUrl = versionInfo.downloadUrl || versionInfo.support?.website || 'https://quickerp.rknain.com';
                    window.open(updateUrl, '_blank');
                });
            } else if (statusElement) {
                statusElement.textContent = '✓ Up to date';
                statusElement.className = 'version-status latest';
                statusElement.title = 'You are running the latest version';
            }
        } catch (error) {
            console.error('Version check failed:', error);
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

    setupEventListeners() {
        const credentialsForm = document.getElementById('credentials-form');
        const securityForm = document.getElementById('security-form');

        credentialsForm?.addEventListener('submit', (e) => this.handleCredentialsSubmit(e));
        securityForm?.addEventListener('submit', (e) => this.handleSecuritySubmit(e));
        document.getElementById('gmail-connect')?.addEventListener('click', () => this.handleGmailConnect());
        document.getElementById('add-security-question')?.addEventListener('click', () => this.addSecurityQuestion());
        document.getElementById('password-toggle')?.addEventListener('click', () => this.togglePasswordVisibility());
        document.getElementById('back-btn')?.addEventListener('click', () => this.previousStep());
        document.getElementById('next-btn')?.addEventListener('click', () => this.handleNextStep());
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.altKey) {
                const activeElement = document.activeElement;
                // Only trigger if not in a textarea or if specifically in setup form inputs
                if (activeElement && (activeElement.tagName !== 'TEXTAREA')) {
                    const setupContainer = document.querySelector('.setup-container');
                    if (setupContainer && setupContainer.contains(activeElement)) {
                        e.preventDefault();
                        this.handleNextStep();
                    }
                }
            }
        });
        
        document.querySelectorAll('.dot').forEach(dot => {
            dot.addEventListener('click', (e) => {
                const step = parseInt(e.target.dataset.step);
                if (step <= this.currentStep) {
                    this.showStep(step);
                }
            });
        });
    }

    async handleCredentialsSubmit(e) {
        if (e) e.preventDefault();
        
        const rollNumber = document.getElementById('roll-number').value.trim();
        const password = document.getElementById('password').value;
        
        if (!rollNumber || !password) {
            window.erpApp.showError('Please fill in all fields');
            return;
        }
        
        this.userData.rollNumber = rollNumber;
        this.userData.password = password;
        
        // Check if security questions already exist locally
        if (this.userData.securityQuestions && this.userData.securityQuestions.length > 0) {
            window.erpApp.showSuccess('Using existing security questions');
            await this.saveSetupData();
            this.nextStep();
            return;
        }
        
        this.showSecurityQuestionsLoading();
        
        try {
            window.erpApp.showSuccess('Fetching your security questions...');
            const questions = await ERPApiService.getSecurityQuestions(rollNumber);
            
            this.userData.securityQuestions = questions.map(question => ({
                question: question,
                answer: '',
                isFetched: true
            }));
            await this.saveSetupData();
            this.nextStep();
            
        } catch (error) {
            console.error('Failed to fetch security questions:', error);
            window.erpApp.showError(`Failed to fetch security questions: ${error.message}`);
            
            // Fall back to manual entry
            this.userData.securityQuestions = [];
            await this.saveSetupData();
            this.showStep(2);
        }
    }

    showSecurityQuestionsLoading() {
        const container = document.querySelector('.security-questions');
        if (!container) return;
        
        container.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner">🔄</div>
                <p>Fetching your security questions from ERP...</p>
            </div>
        `;
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML.replace(/"/g, '&quot;');
    }

    loadFetchedSecurityQuestions() {
        this.prefillSecurityQuestions();
    }

    loadSecurityQuestions() {
        const container = document.querySelector('.security-questions');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (this.userData.securityQuestions && this.userData.securityQuestions.length > 0) {
            this.prefillSecurityQuestions();
        } else {
            for (let i = 0; i < this.SECURITY_QUESTIONS_COUNT; i++) {
                this.addSecurityQuestion();
            }
        }
    }
    
    addSecurityQuestion() {
        const container = document.querySelector('.security-questions');
        if (!container) return;
        
        const questionNumber = container.children.length + 1;
        const questionDiv = document.createElement('div');
        questionDiv.className = 'security-question-card';
        questionDiv.innerHTML = `
            <div class="card-header">
                <span class="question-number">Q${questionNumber}</span>
                <button type="button" class="remove-question">&times;</button>
            </div>
            <div class="question-field">
                <label>Security Question</label>
                <input type="text" class="security-question" placeholder="What is your mother's maiden name?" required>
            </div>
            <div class="answer-field">
                <label>Answer</label>
                <input type="text" class="security-answer" placeholder="Your answer" required>
            </div>
        `;
        
        // Add remove functionality
        const removeBtn = questionDiv.querySelector('.remove-question');
        removeBtn.addEventListener('click', () => {
            questionDiv.remove();
            this.updateQuestionNumbers();
        });
        
        container.appendChild(questionDiv);
    }

    updateQuestionNumbers() {
        const container = document.querySelector('.security-questions');
        if (!container) return;
        
        const questionCards = container.querySelectorAll('.security-question-card');
        questionCards.forEach((card, index) => {
            const numberSpan = card.querySelector('.question-number');
            if (numberSpan) {
                numberSpan.textContent = `Q${index + 1}`;
            }
        });
    }

    async saveSetupData() {
        try {
            await StorageService.set('user_data', this.userData);
        } catch (error) {
            console.error('Failed to save setup data:', error);
        }
    }

    async loadStoredSetupData() {
        try {
            const storedData = await StorageService.get('user_data');
            if (storedData) {
                this.userData = storedData;
                this.prefillForms();
                window.erpApp.showSuccess('Previous setup data loaded');
            }
        } catch (error) {
            console.error('Failed to load setup data:', error);
        }
    }

    prefillForms() {
        if (this.userData.rollNumber) {
            const rollNumberInput = document.getElementById('roll-number');
            if (rollNumberInput) {
                rollNumberInput.value = this.userData.rollNumber;
            }
        }
        
        if (this.userData.password) {
            const passwordInput = document.getElementById('password');
            if (passwordInput) {
                passwordInput.value = this.userData.password;
            }
        }

        if (this.userData.securityQuestions) {
            this.prefillSecurityQuestions();
        }
        this.checkAndPrefillGmailStatus();
    }

    prefillSecurityQuestions() {
        const container = document.querySelector('.security-questions');
        if (!container || !this.userData.securityQuestions) {
            return;
        }

        container.innerHTML = '';
        
        this.userData.securityQuestions.forEach((qa, index) => {
            const questionDiv = document.createElement('div');
            
            if (qa.isFetched) {
                questionDiv.className = 'security-question-card fetched';
                questionDiv.innerHTML = `
                    <div class="card-header">
                        <span class="question-number">Q${index + 1}</span>
                        <span class="fetched-badge">📥 Auto-fetched</span>
                    </div>
                    <div class="question-field">
                        <label>Security Question</label>
                        <div class="readonly-question">${this.escapeHtml(qa.question)}</div>
                    </div>
                    <div class="answer-field">
                        <label>Your Answer</label>
                        <input type="text" class="security-answer" placeholder="Enter your answer" value="${this.escapeHtml(qa.answer || '')}" required>
                    </div>
                `;
            } else {
                questionDiv.className = 'security-question-card';
                questionDiv.innerHTML = `
                    <div class="card-header">
                        <span class="question-number">Q${index + 1}</span>
                        <button type="button" class="remove-question">&times;</button>
                    </div>
                    <div class="question-field">
                        <label>Security Question</label>
                        <input type="text" class="security-question" placeholder="Enter security question" value="${this.escapeHtml(qa.question || '')}" required>
                    </div>
                    <div class="answer-field">
                        <label>Answer</label>
                        <input type="text" class="security-answer" placeholder="Your answer" value="${this.escapeHtml(qa.answer || '')}" required>
                    </div>
                `;
                
                const removeBtn = questionDiv.querySelector('.remove-question');
                removeBtn.addEventListener('click', () => {
                    questionDiv.remove();
                    this.updateQuestionNumbers();
                });
            }
            
            container.appendChild(questionDiv);
        });
    }

    async checkAndPrefillGmailStatus() {
        const gmailData = await CredentialService.getGmailData();
        if (gmailData) {
            setTimeout(() => {
                this.prefillGmailStatus(gmailData);
            }, 100);
        }
    }

    prefillGmailStatus(gmailData) {
        if (!gmailData) return;
        
        const button = document.getElementById('gmail-connect');
        const status = document.querySelector('.gmail-status');
        
        if (button && status) {
            button.textContent = 'Connected';
            button.disabled = true;
            status.className = 'gmail-status connected';
            status.textContent = `✓ Connected: ${gmailData.email || 'Gmail'}`;
        }
    }

    async handleSecuritySubmit(e) {
        if (e) e.preventDefault();
        
        const securityQuestions = [];
        const cards = document.querySelectorAll('.security-question-card');
        
        cards.forEach((card) => {
            let question, answer, isFetched;
            
            const readonlyQuestion = card.querySelector('.readonly-question');
            if (readonlyQuestion) {
                question = readonlyQuestion.textContent.trim();
                answer = card.querySelector('.security-answer')?.value?.trim() || '';
                isFetched = true;
            } else {
                question = card.querySelector('.security-question')?.value?.trim() || '';
                answer = card.querySelector('.security-answer')?.value?.trim() || '';
                isFetched = false;
            }
            
            if (question && answer) {
                securityQuestions.push({ question, answer, isFetched });
            }
        });
        
        if (securityQuestions.length !== this.SECURITY_QUESTIONS_COUNT) {
            window.erpApp.showError(`Please provide exactly ${this.SECURITY_QUESTIONS_COUNT} security questions`);
            return;
        }
        
        this.userData.securityQuestions = securityQuestions;
        await this.saveSetupData();
        this.nextStep();
    }

    async handleGmailConnect() {
        try {
            const button = document.getElementById('gmail-connect');
            const status = document.querySelector('.gmail-status');
            
            button.disabled = true;
            button.innerHTML = '<span>🔄 Connecting...</span>';
            
            const tokenData = await GmailService.authenticate();
            
            await CredentialService.saveGmailData(tokenData);
            
            status.className = 'gmail-status connected';
            status.textContent = `✓ Connected: ${tokenData.email}`;
            button.innerHTML = '<span>✅ Connected</span>';
            
            await this.completeSetup();
            setTimeout(() => this.app.navigateToScreen('dashboard'), 1500);
        } catch (error) {
            window.erpApp.handleDetailedError(error);
            
            const button = document.getElementById('gmail-connect');
            const status = document.querySelector('.gmail-status');
            
            button.disabled = false;
            button.innerHTML = '<span>🔗 Retry Connection</span>';
            status.className = 'gmail-status error';
            status.textContent = '✗ Connection failed. Please try again.';
        }
    }

    async completeSetup() {
        try {
            const success = await CredentialService.saveUserData(
                this.userData.rollNumber,
                this.userData.password,
                this.userData.securityQuestions
            );
            
            if (!success) {
                this.app.showError('Failed to save setup data');
                return false;
            }
            
            await this.app.getController('app').loadUserInfo();
            
            this.app.showSuccess('Setup completed successfully!');
            return true;
        } catch (error) {
            console.error('Setup completion failed:', error);
            this.app.showError('Failed to complete setup');
            return false;
        }
    }

    showStep(step) {
        this.currentStep = step;
        
        document.querySelectorAll('.step').forEach(stepEl => {
            stepEl.classList.remove('active');
        });
        
        const targetStep = document.querySelector(`.step[data-step="${step}"]`);
        if (targetStep) {
            targetStep.classList.add('active');
        }
        document.querySelectorAll('.dot').forEach((dot, index) => {
            dot.classList.remove('active', 'completed');
            const dotStep = index + 1;
            
            if (dotStep < step) {
                dot.classList.add('completed');
            } else if (dotStep === step) {
                dot.classList.add('active');
            }
        });
        
        const stepCounter = document.getElementById('current-step');
        if (stepCounter) {
            stepCounter.textContent = step;
        }
        
        const backBtn = document.getElementById('back-btn');
        const nextBtn = document.getElementById('next-btn');
        
        if (backBtn) {
            backBtn.disabled = step === 1;
        }
        
        if (nextBtn) {
            if (step === 3) {
                nextBtn.textContent = 'Finish';
            } else {
                nextBtn.textContent = 'Next';
            }
        }

        if (step === 2) {
            setTimeout(() => {
                this.loadSecurityQuestions();
            }, 50);
        } else if (step === 3) {
            setTimeout(() => {
                this.checkAndPrefillGmailStatus();
            }, 50);
        }
    }


    handleNextStep() {
        if (this.currentStep === 1) {
            this.handleCredentialsSubmit();
        } else if (this.currentStep === 2) {
            this.handleSecuritySubmit();
        } else if (this.currentStep === 3) {
            this.handleGmailConnect();
        }
    }

    nextStep() {
        if (this.currentStep < 3) {
            this.showStep(this.currentStep + 1);
        }
    }
    
    navigateToStep(step) {
        if (step >= 1 && step <= 3) {
            this.showStep(step);
        }
    }

    togglePasswordVisibility() {
        const passwordInput = document.getElementById('password');
        const passwordToggle = document.getElementById('password-toggle');
        
        if (passwordInput && passwordToggle) {
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                passwordToggle.textContent = '🙈';
            } else {
                passwordInput.type = 'password';
                passwordToggle.textContent = '👁️';
            }
        }
    }

    previousStep() {
        if (this.currentStep > 1) {
            this.showStep(this.currentStep - 1);
        }
    }
}
