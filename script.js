document.addEventListener("DOMContentLoaded", function() {
    // Get references to input fields and output element
    const temperatureInput = document.getElementById("temperature");
    const humidityInput = document.getElementById("humidity");
    const vpdValueDiv = document.getElementById("vpd-value");
    const vpdRange = document.getElementById("vpd-range");
    const unitRadios = document.querySelectorAll('input[name="units"]');
    const unitSymbol = document.querySelector('.unit-symbol');
    let currentUnit = "F"; // Default unit

    // Create error message elements
    const temperatureErrorMessage = document.createElement("span");
    temperatureErrorMessage.className = "error-message";
    temperatureInput.parentElement.appendChild(temperatureErrorMessage);

    // Function to calculate VPD
    function calculateVPD(tempF, rh) {
        const tempC = (tempF - 32) / 1.8;
        const svp = 0.6108 * Math.exp((17.27 * tempC) / (tempC + 237.3));
        const vpd = (1 - (rh / 100)) * svp;
        return parseFloat(vpd.toFixed(3)); // Return VPD rounded to 3 decimal places
    }

    // Function to update VPD display
    function updateVPD() {
        let tempValue = parseFloat(temperatureInput.value);
        let rh = parseFloat(humidityInput.value);

        // Trim input values to ensure they have no more than two digits
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
                // Convert Celsius to Fahrenheit
                tempF = (tempValue * 1.8) + 32;
            }
            const vpd = calculateVPD(tempF, rh);
            vpdValueDiv.textContent = `VPD: ${vpd}`;
            vpdRange.value = vpd;
        } else {
            vpdValueDiv.textContent = "VPD: -";
        }
    }

    // Function to convert temperature between Celsius and Fahrenheit
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

    // Function to validate temperature input
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
            // updateVPD();
        }
    }

    // Function to validate humidity input
    function validateHumidity() {
        let rhValue = parseFloat(humidityInput.value);
        if (isNaN(rhValue)) return;

        if (rhValue < 0) {
            humidityInput.value = 0;
        } else if (rhValue > 99) {
            humidityInput.value = 99;
        }
    }

    // Function to show error message with animation
    function showErrorMessage(element, message) {
        element.textContent = message;
        element.style.display = "block"; // Ensure the element is displayed
        requestAnimationFrame(() => {
            element.classList.remove("hide");
            element.classList.add("show");
        });
        setTimeout(() => hideErrorMessage(element), 1500);
    }

    // Function to hide error message with animation
    function hideErrorMessage(element) {
        element.classList.remove("show");
        element.classList.add("hide");
        setTimeout(() => {
            element.style.display = "none"; // Hide the element after the animation
        }, 300); // Match this timeout to the duration of the hide transition
    }

    // Event listener for unit radio buttons
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

    // Initial setup to update the unit symbol based on the default radio button
    unitSymbol.textContent = `°${currentUnit}`;

    // Add event listeners to input fields to update VPD when values change
    temperatureInput.addEventListener("input", function() {
        if (this.value.length === 2) {
            validateTemperature();
        }
        updateVPD();
    });
    humidityInput.addEventListener("input", updateVPD);

    // Event listener to update the VPD when the slider is moved
    vpdRange.addEventListener("input", function () {
        vpdValueDiv.textContent = `VPD: ${vpdRange.value}`;
    });

    // Add event listener to temperature input field to validate on blur
    temperatureInput.addEventListener("blur", validateTemperature);
    humidityInput.addEventListener("blur", validateHumidity);

    // Restrict input to digits only for temperature and humidity inputs
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

    // Limit input to two digits for temperature and humidity inputs
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