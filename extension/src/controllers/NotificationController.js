import { VersionService } from '../services/VersionService.js';

export class NotificationController {
    constructor(app) {
        this.app = app;
        this.notifications = [];
    }

    async init() {
        this.setupEventListeners();
        await this.loadNotifications();
    }

    setupEventListeners() {
        const notificationBtn = document.getElementById('notification-nav-btn');
        const closeBtn = document.getElementById('close-notifications');
        const panel = document.getElementById('notification-panel');

        if (!notificationBtn) {
            console.error('Notification button not found!');
            return;
        }

        
        notificationBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            // Reload notifications every time panel is opened (always fresh)
            await this.loadNotifications();
            this.togglePanel();
        });
        
        closeBtn?.addEventListener('click', () => this.closePanel());

        // Close panel when clicking outside
        document.addEventListener('click', (e) => {
            if (panel && !panel.classList.contains('hidden')) {
                if (!panel.contains(e.target) && !notificationBtn.contains(e.target)) {
                    this.closePanel();
                }
            }
        });
    }

    async loadNotifications() {
        try {
            const unreadNotifications = await VersionService.getUnreadNotifications();
            this.notifications = unreadNotifications;
            this.updateBadge();
            this.renderNotifications();
        } catch (error) {
            console.error('Failed to load notifications:', error);
        }
    }

    updateBadge() {
        const badge = document.getElementById('notification-badge');
        if (badge) {
            if (this.notifications.length > 0) {
                badge.textContent = this.notifications.length;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }
    }

    renderNotifications() {
        const listElement = document.getElementById('notification-list');
        if (!listElement) return;

        if (this.notifications.length === 0) {
            listElement.innerHTML = `
                <div class="notification-empty">
                    <span class="empty-icon">🔔</span>
                    <p>No notifications</p>
                </div>
            `;
            return;
        }

        // Sort by priority (high first)
        const sortedNotifications = [...this.notifications].sort((a, b) => {
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            return (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1);
        });

        listElement.innerHTML = sortedNotifications.map(notification => 
            this.createNotificationHTML(notification)
        ).join('');

        // Add event listeners for actions
        sortedNotifications.forEach(notification => {
            const dismissBtn = document.getElementById(`dismiss-${notification.id}`);
            if (dismissBtn) {
                dismissBtn.addEventListener('click', () => this.dismissNotification(notification.id));
            }
        });
    }

    createNotificationHTML(notification) {
        const typeClass = notification.type || 'info';
        const hasButtons = Array.isArray(notification.buttons) && notification.buttons.length > 0;
        
        // Support old format (link + linkText) for backward compatibility
        const hasLegacyLink = notification.link && notification.linkText;
        
        return `
            <div class="notification-item ${typeClass}">
                <h4 class="notification-title">${notification.title}</h4>
                <p class="notification-message">${notification.message}</p>
                <div class="notification-actions">
                    ${hasButtons ? notification.buttons.map(button => `
                        <a href="${button.link}" target="_blank" class="notification-link ${button.type || 'primary'}">
                            ${button.text}
                        </a>
                    `).join('') : ''}
                    ${hasLegacyLink && !hasButtons ? `
                        <a href="${notification.link}" target="_blank" class="notification-link primary">
                            ${notification.linkText}
                        </a>
                    ` : ''}
                    ${notification.dismissible ? `
                        <button id="dismiss-${notification.id}" class="notification-dismiss">
                            Dismiss
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    async dismissNotification(notificationId) {
        try {
            await VersionService.dismissNotification(notificationId);
            this.notifications = this.notifications.filter(n => n.id !== notificationId);
            this.updateBadge();
            this.renderNotifications();
        } catch (error) {
            console.error('Failed to dismiss notification:', error);
        }
    }

    togglePanel() {
        const panel = document.getElementById('notification-panel');
        if (panel) {
            panel.classList.toggle('hidden');
        }
    }

    closePanel() {
        const panel = document.getElementById('notification-panel');
        if (panel) {
            panel.classList.add('hidden');
        }
    }
}
