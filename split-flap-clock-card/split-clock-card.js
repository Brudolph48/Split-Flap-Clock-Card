class SplitClockCard extends HTMLElement {
    constructor() {
        super();
        this.DEBUG = false;

        // Attach shadow DOM
        this.attachShadow({ mode: 'open' });

        // Container setup
        this.container = document.createElement('div');
        this.container.classList.add('flip-clock-wrapper');
        this.shadowRoot.appendChild(this.container);

        // CSS Link
        const flipClockCSS = document.createElement('link');
        flipClockCSS.setAttribute('rel', 'stylesheet');
        flipClockCSS.setAttribute('type', 'text/css');
        flipClockCSS.setAttribute('href', '/local/splitclockcard/splitflap.css');
        this.shadowRoot.appendChild(flipClockCSS);

        // Initialize empty digits array
        this.digits = [];
        this.clockInitialized = false; // Track initialization
    }

    setConfig(config) {
        if (this.DEBUG) console.log('setConfig called with:', config);
    
        const defaultConfig = {
            scale: 1,
            showSeconds: false,
            showMeridiem: false,
            entity: '',
            colors: {
                dot: '#FF0000',
                meridiem: '#00FF00',
                digit: '#FFFFFF',
                flap: '#000000'
            }
        };
    
        this.config = {
            ...defaultConfig,
            ...config,
            colors: { ...defaultConfig.colors, ...config.colors }
        };
    
        const { scale, colors } = this.config;
    
        // Apply scaling
        this.container.style.transform = `scale(${scale})`;
        this.container.style.transformOrigin = 'center center'; // Ensure scaling is centered
    
        // Update the container to stay centered
        this.style.display = 'flex';
        this.style.justifyContent = 'center';
        this.style.alignItems = 'center';
        this.style.height = '100%'; // Ensure full height
        this.style.width = '100%'; // Ensure full width
    
        // Apply colors
        this.container.style.setProperty('--dot-color', colors.dot);
        this.container.style.setProperty('--meridiem-color', colors.meridiem);
        this.container.style.setProperty('--digit-color', colors.digit);
        this.container.style.setProperty('--flap-color', colors.flap);
    
        // Ensure the container resizes properly
        this.container.style.width = 'fit-content';
        this.container.style.height = 'fit-content';
    
        // Initialize the clock
        if (!this.clockInitialized) {
            if (this.DEBUG) console.log('Initializing clock for the first time');
            this.initializeClock();
        }
    }

    initializeClock() {
        this.buildClock();
        this.startClock();
        this.clockInitialized = true;
    }

    buildClock() {
        const timeFormat = this.config.showSeconds ? [2, 2, 2] : [2, 2]; // HH:MM or HH:MM:SS
        const clockWrapper = document.createElement('div');
        clockWrapper.classList.add('flip-clock-inner-wrapper');
        clockWrapper.style.display = 'flex';
        clockWrapper.style.alignItems = 'center';
        clockWrapper.style.gap = '5px';
        clockWrapper.style.height = '100%'; // Ensure it fills the card vertically
        clockWrapper.style.flexGrow = '1'; // Allow vertical centering

        this.container.appendChild(clockWrapper);

        // Generate digit elements and separators
        timeFormat.forEach((digitCount, index) => {
            for (let i = 0; i < digitCount; i++) {
                const list = document.createElement('ul');
                list.classList.add('flip', 'play');

                const before = document.createElement('li');
                before.classList.add('flip-clock-before');
                before.innerHTML = `
                    <a href="#">
                        <div class="up"><div class="inn">0</div></div>
                        <div class="down"><div class="inn">0</div></div>
                    </a>
                `;

                const active = document.createElement('li');
                active.classList.add('flip-clock-active');
                active.innerHTML = `
                    <a href="#">
                        <div class="up"><div class="inn">0</div></div>
                        <div class="down"><div class="inn">0</div></div>
                    </a>
                `;

                list.appendChild(before);
                list.appendChild(active);
                clockWrapper.appendChild(list);
                this.digits.push(list);
            }

            // Add dot separator
            if (index < timeFormat.length - 1) {
                const divider = document.createElement('div');
                divider.classList.add('flip-clock-divider');
                
                const topDot = document.createElement('span');
                topDot.classList.add('flip-clock-dot', 'top');
                const bottomDot = document.createElement('span');
                bottomDot.classList.add('flip-clock-dot', 'bottom');
                
                divider.appendChild(topDot);
                divider.appendChild(bottomDot);
                clockWrapper.appendChild(divider);
            }
        });

        // Meridiem (AM/PM)
        if (this.config.showMeridiem) {
            this.meridiem = document.createElement('div');
            this.meridiem.className = 'flip-clock-meridiem';
            clockWrapper.appendChild(this.meridiem);
        }
    }

    startClock() {
        this.updateClock();
        setInterval(() => this.updateClock(), 1000); // Update every second
    }

    set hass(hass) {
        this._hass = hass;
        this.updateClock();
    }

    updateClock() {
        if (!this._hass || !this.config.entity) return;

        const entityState = this._hass.states[this.config.entity]?.state;
        if (!entityState || !/^\d{2}:\d{2}(:\d{2})?$/.test(entityState)) return;

        const [hours, minutes, seconds] = entityState.split(':');
        let formattedHours = parseInt(hours, 10);
        let meridiem = '';

        if (this.config.showMeridiem) {
            meridiem = formattedHours >= 12 ? 'PM' : 'AM';
            formattedHours = formattedHours % 12 || 12;
        }

        const timeArray = [
            ...this.padNumber(formattedHours),
            ...this.padNumber(minutes),
            ...(this.config.showSeconds ? this.padNumber(seconds) : ''),
        ];

        this.digits.forEach((digit, index) => {
            const newValue = timeArray[index] || '0';
            this.animateFlip(digit, newValue);
        });

        if (this.config.showMeridiem && this.meridiem) {
            /*console.log('Setting meridiem text to:', meridiem);*/
            this.meridiem.textContent = meridiem;
        }
    }

    padNumber(num) {
        return num.toString().padStart(2, '0');
    }

    animateFlip(list, newValue) {
        const beforeUp = list.querySelector('.flip-clock-before .up .inn');
        const activeUp = list.querySelector('.flip-clock-active .up .inn');
        const activeDown = list.querySelector('.flip-clock-active .down .inn');

        if (activeUp.textContent !== newValue) {
            activeDown.textContent = newValue;
            list.classList.add('play');
            setTimeout(() => (activeUp.textContent = newValue), 75);
            setTimeout(() => {
                beforeUp.textContent = newValue;
                list.classList.remove('play');
            }, 250);
        }
    }

    getCardSize() {
        return 3;
    }
}

customElements.define('split-clock-card', SplitClockCard);
