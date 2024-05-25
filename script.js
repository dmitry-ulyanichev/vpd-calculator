
document.addEventListener("DOMContentLoaded", function() {
    const growthStageSelect = document.getElementById("growth-stage");
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
    let isTemperatureLocked = true; // Default to temperature locked

    const gradientPercentages = {
        seedling: "0% 1%, orange 21%, green 27%, green 31%, orange 37%, rgb(220, 0, 0) 57%, rgb(220, 0, 0) 100%",
        veg: "0% 10%, orange 30%, green 36%, green 49%, orange 55%, rgb(220, 0, 0) 75%, rgb(220, 0, 0) 100%",
        flower: "0% 19%, orange 39%, green 45%, green 66%, orange 72%, rgb(220, 0, 0) 92%, rgb(220, 0, 0) 100%",
        "late-flower": "0% 23%, orange 45%, green 51%, green 64%, orange 70%, rgb(220, 0, 0) 90%, rgb(220, 0, 0) 100%"
    };

    const temperatureErrorMessage = document.createElement("span");
    temperatureErrorMessage.className = "error-message";
    temperatureInput.parentElement.appendChild(temperatureErrorMessage);

    // Event listener for radio buttons selecting Celsius or Fahrenheit units
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

    // Event listener for the growth stage select
    growthStageSelect.addEventListener("change", updateLinearGradient);

    temperatureInput.addEventListener("input", function() {
        if (this.value.length === 2) {
            validateTemperature();
        }
        updateVPD();
    });

    humidityInput.addEventListener("input", updateVPD);

    // Event listeners for temp and RH inputs and their validation
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

    lockTemperatureIcon.addEventListener('click', function() {
        isTemperatureLocked = !isTemperatureLocked; // Toggle lock status
        toggleLockIcons();
    });

    lockHumidityIcon.addEventListener('click', function() {
        isTemperatureLocked = !isTemperatureLocked; // Toggle lock status
        toggleLockIcons();
    });

    vpdRange.addEventListener('input', function() {
        let vpd = parseFloat(vpdRange.value);
        vpd = sliderValueToVPD(vpd);
        let tempValue = parseFloat(temperatureInput.value);
        let rhValue = parseFloat(humidityInput.value);

        function setDefaultTemp() {
            if (currentUnit === "C") {
                return 25;
            } else {
                return 77;
            }
        }
    
        // Check if temp or both temp and RH inputs are empty
        if (isNaN(tempValue) && isNaN(rhValue)) {
            // Set a default temperature value based on the current unit
            temperatureInput.value = setDefaultTemp();
        } else if (isNaN(tempValue) && rhValue && isTemperatureLocked) {
            toggleLockIcons();
            temperatureInput.value = setDefaultTemp();
        }
    
        if (isTemperatureLocked && !isNaN(tempValue)) {
            rhValue = calculateRequiredHumidity(tempValue, vpd);
            if (rhValue > 99 || rhValue < 0) {
                humidityInput.classList.add('invalid-input');
            }
            humidityInput.value = rhValue;
        } else if (!isTemperatureLocked && !isNaN(rhValue)) {
            tempValue = calculateRequiredTemperature(rhValue, vpd);
            const invalidTemp = currentUnit === "F" && (tempValue > 99 || tempValue < 53) || currentUnit === "C" && (tempValue > 37 || tempValue < 12);
            if (invalidTemp) {
                temperatureInput.classList.add('invalid-input');
            }
            temperatureInput.value = tempValue;
        }
    
        vpdValueDiv.textContent = `VPD: ${vpd}`;
    });

    vpdRange.addEventListener('mouseup', handleSliderRelease);
    vpdRange.addEventListener('touchend', handleSliderRelease);
    
    function handleSliderRelease() {
        if (isTemperatureLocked) {
            validateHumidity();
        } else if (!isTemperatureLocked) {
            validateTemperature();
        }
        updateVPD();
        temperatureInput.classList.remove('invalid-input');
        humidityInput.classList.remove('invalid-input');
    }

    function updateLinearGradient() {
        const growthStage = growthStageSelect.value;
        const gradientPercentage = gradientPercentages[growthStage];
        vpdRange.style.background = `linear-gradient(to right, rgb(220, 0, 0) ${gradientPercentage})`;
    }

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
            vpdRange.value = mapVPDToSlider(vpd);
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

    function mapVPDToSlider(vpd) {
        const minVPD = 0.01;
        const maxVPD = 6.36;
        const part1MaxVPD = 1.6;
        const part1Range = part1MaxVPD - minVPD;
        const part2Range = maxVPD - part1MaxVPD;
      
        const part1Percentage = 0.7;
        const part2Percentage = 1 - part1Percentage;
      
        if (vpd <= part1MaxVPD) {
          const mappedValue = minVPD + ((vpd - minVPD) / part1Range) * (part1Percentage * 100);
          return mappedValue;
        } else {
          const part1End = minVPD + part1Percentage * 100;
          const mappedValue = part1End + ((vpd - part1MaxVPD) / part2Range) * (part2Percentage * 100);
          return mappedValue;
        }
    }

    function sliderValueToVPD(sliderValue) {
        const minVPD = 0.01;
        const maxVPD = 6.36;
        const part1MaxVPD = 1.6;
        const part1Range = part1MaxVPD - minVPD;
        const part2Range = maxVPD - part1MaxVPD;
      
        const part1Percentage = 0.7;
        const part2Percentage = 1 - part1Percentage;
      
        if (sliderValue <= part1Percentage * 100) {
          const mappedValue = minVPD + ((sliderValue / (part1Percentage * 100)) * part1Range);
          return parseFloat(mappedValue.toFixed(2));
        } else {
          const part1End = minVPD + part1Range;
          const part2Start = sliderValue - (part1Percentage * 100);
          const mappedValue = part1End + ((part2Start / (part2Percentage * 100)) * part2Range);
          return parseFloat(mappedValue.toFixed(2));
        }
    }
});