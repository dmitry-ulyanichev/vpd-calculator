
document.addEventListener("DOMContentLoaded", function() {
    const temperatureInput = document.getElementById("temperature");
    const humidityInput = document.getElementById("humidity");
    const vpdValueDiv = document.getElementById("vpd-value");
    const vpdRange = document.getElementById("vpd-range");
    const unitRadios = document.querySelectorAll('input[name="units"]');
    const unitSymbol = document.querySelector('.unit-symbol');
    const lockIcons = document.querySelectorAll('.custom-lock-icon')
    const lockTemperatureIcon = document.getElementById('lock-temperature');
    const lockHumidityIcon = document.getElementById('lock-humidity');
    let currentUnit = "F"; // Default unit

    const temperatureErrorMessage = document.createElement("span");
    temperatureErrorMessage.className = "error-message";
    temperatureInput.parentElement.appendChild(temperatureErrorMessage);

    let isTemperatureLocked = true; // Default to temperature locked

    lockTemperatureIcon.addEventListener('click', function() {
        isTemperatureLocked = !isTemperatureLocked; // Toggle lock status
        toggleLockIcons();
    });

    lockHumidityIcon.addEventListener('click', function() {
        isTemperatureLocked = !isTemperatureLocked; // Toggle lock status
        toggleLockIcons();
    });

    function toggleLockIcons() {
        for (let icon of lockIcons) {
            if (icon.classList.contains('fa-lock-open')) {
                icon.classList.remove('fa-lock-open');
                icon.classList.add('fa-lock');
            } else if (icon.classList.contains('fa-lock')) {
                icon.classList.remove('fa-lock');
                icon.classList.add('fa-lock-open');
            }
        }
    }    

    function calculateVPD(tempF, rh) {
        const tempC = (tempF - 32) / 1.8;
        const svp = 0.6108 * Math.exp((17.27 * tempC) / (tempC + 237.3));
        const vpd = (1 - (rh / 100)) * svp;
        return parseFloat(vpd.toFixed(3));
    }

    function calculateRequiredHumidity(temp, vpd) {
        let tempC = temp;
        if (currentUnit == "F") {
            tempC = (temp - 32) / 1.8;
        }
        const svp = 0.6108 * Math.exp((17.27 * tempC) / (tempC + 237.3));
        const rh = (1 - (vpd / svp)) * 100;
        return Math.round(rh);
    }

    function calculateRequiredTemperature(rh, vpd) {
        let tempC = 1; // Start with a guess
        let svp, vpdCalculated;
        const maxIterations = 1000; // Maximum number of iterations
        const tolerance = 0.001; // Acceptable tolerance for VPD difference
        let iterations = 0;
    
        do {
            svp = 0.6108 * Math.exp((17.27 * tempC) / (tempC + 237.3));
            vpdCalculated = (1 - (rh / 100)) * svp;
            if (vpdCalculated < vpd) {
                tempC += 0.1; // Increment guess
            } else {
                tempC -= 0.1; // Decrement guess
            }
            iterations++;
        } while (Math.abs(vpdCalculated - vpd) > tolerance && iterations < maxIterations);
    
        let tempResult;
        if (currentUnit === "C") {
            tempResult = Math.round(tempC);
        } else {
            tempResult = Math.round((tempC * 1.8) + 32);
        }
    
        return tempResult;
    }

    function updateVPD() {

        let tempValue = parseFloat(temperatureInput.value);
        let rh = parseFloat(humidityInput.value);

        if (!isNaN(tempValue) && tempValue.toString().length > 2) {
            tempValue = parseFloat(tempValue.toString().slice(0, 2));
            temperatureInput.value = tempValue;
        }
        if (!isNaN(rh) && rh.toString().length > 2) {
            rh = parseFloat(rh.toString().slice(0, 2));
            humidityInput.value = rh;
        }

        if (!isNaN(tempValue) && !isNaN(rh)) {
            let tempF = tempValue;
            if (currentUnit === "C") {
                tempF = (tempValue * 1.8) + 32;
            }
            const vpd = calculateVPD(tempF, rh);
            vpdValueDiv.textContent = `VPD: ${vpd}`;
            vpdRange.value = vpd;
        } else {
            vpdValueDiv.textContent = "VPD: -";
        }
    }

    function convertTemperature(value, fromUnit, toUnit) {
        if (fromUnit === toUnit) {
            return value;
        }
        if (fromUnit === "F" && toUnit === "C") {
            return ((value - 32) / 1.8).toFixed(0);
        }
        if (fromUnit === "C" && toUnit === "F") {
            return ((value * 1.8) + 32).toFixed(0);
        }
        return value;
    }

    function validateTemperature() {
        let tempValue = parseFloat(temperatureInput.value);
        if (isNaN(tempValue)) return;

        let minTemp, maxTemp;
        if (currentUnit === "C") {
            minTemp = 12;
            maxTemp = 37;
        } else {
            minTemp = 53;
            maxTemp = 99;
        }

        if (tempValue < minTemp) {
            temperatureInput.value = minTemp;
            updateVPD();
            showErrorMessage(temperatureErrorMessage, `${minTemp}°${currentUnit} is the minimum temperature value`);
        } else if (tempValue > maxTemp) {
            temperatureInput.value = maxTemp;
            updateVPD();
            showErrorMessage(temperatureErrorMessage, `${maxTemp}°${currentUnit} is the maximum temperature value`);
        } else {
            hideErrorMessage(temperatureErrorMessage);
        }
    }

    function validateHumidity() {
        let rhValue = parseFloat(humidityInput.value);
        if (isNaN(rhValue)) return;

        if (rhValue < 0) {
            humidityInput.value = 0;
        } else if (rhValue > 99) {
            humidityInput.value = 99;
        }
    }

    function showErrorMessage(element, message) {
        element.textContent = message;
        element.style.display = "block";
        requestAnimationFrame(() => {
            element.classList.remove("hide");
            element.classList.add("show");
        });
        setTimeout(() => hideErrorMessage(element), 1500);
    }

    function hideErrorMessage(element) {
        element.classList.remove("show");
        element.classList.add("hide");
        setTimeout(() => {
            element.style.display = "none";
        }, 300);
    }

    unitRadios.forEach(radio => {
        radio.addEventListener("change", function() {
            const newUnit = this.value;
            if (newUnit !== currentUnit) {
                const tempValue = parseFloat(temperatureInput.value);
                if (!isNaN(tempValue)) {
                    const convertedTemp = convertTemperature(tempValue, currentUnit, newUnit);
                    temperatureInput.value = convertedTemp;
                }
                currentUnit = newUnit;
                unitSymbol.textContent = `°${newUnit}`;
                updateVPD();
            }
        });
    });

    unitSymbol.textContent = `°${currentUnit}`;

    temperatureInput.addEventListener("input", function() {
        if (this.value.length === 2) {
            validateTemperature();
        }
        updateVPD();
    });

    humidityInput.addEventListener("input", updateVPD);

    vpdRange.addEventListener('input', function () {

        const vpd = parseFloat(vpdRange.value);
        let tempValue = parseFloat(temperatureInput.value);
        let rhValue = parseFloat(humidityInput.value);

        if (isTemperatureLocked && !isNaN(tempValue)) {
            rhValue = calculateRequiredHumidity(tempValue, vpd);
            if (rhValue > 99 || rhValue < 0) {
                humidityInput.classList.add('invalid-input');
            }
            humidityInput.value = rhValue;
        } else if (!isTemperatureLocked && !isNaN(rhValue)) {
            tempValue = calculateRequiredTemperature(rhValue, vpd);
            const invalidTemp = currentUnit == "F" && (tempValue > 99 || tempValue < 53) || currentUnit == "C" && (tempValue >37 || tempValue <12);
            if (invalidTemp) {
                temperatureInput.classList.add('invalid-input');
            }
            temperatureInput.value = tempValue;
        }

        vpdValueDiv.textContent = `VPD: ${vpd}`;

    });

    vpdRange.addEventListener('mouseup', function() {
        if (isTemperatureLocked) {
            validateHumidity();
        } else if (!isTemperatureLocked) {
            validateTemperature();
        }
        updateVPD();
        temperatureInput.classList.remove('invalid-input');
        humidityInput.classList.remove('invalid-input');
    });

    temperatureInput.addEventListener("blur", validateTemperature);
    humidityInput.addEventListener("blur", validateHumidity);

    temperatureInput.addEventListener("keydown", function(event) {
        if (event.key.length === 1 && !/[0-9]/.test(event.key)) {
            event.preventDefault();
        }
    });

    humidityInput.addEventListener("keydown", function(event) {
        if (event.key.length === 1 && !/[0-9]/.test(event.key)) {
            event.preventDefault();
        }
    });

    temperatureInput.addEventListener("input", function() {
        if (this.value.length > 2) {
            this.value = this.value.slice(0, 2);
        }
    });

    humidityInput.addEventListener("input", function() {
        if (this.value.length > 2) {
            this.value = this.value.slice(0, 2);
        }
    });
});