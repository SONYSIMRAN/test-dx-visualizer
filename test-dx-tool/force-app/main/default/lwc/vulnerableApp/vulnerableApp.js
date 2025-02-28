import { LightningElement } from 'lwc';

export default class VulnerableApp extends LightningElement {
    // Hardcoded API Key (Security Issue)
    apiKey = '12345-SECRET-API-KEY';

    connectedCallback() {
        // Direct DOM manipulation (Violates LWC best practices)
        document.querySelector('body').style.backgroundColor = 'red';

        // Unused variable (Code smell)
        let unusedVar = 100;

        // Missing error handling (Runtime crash)
        let riskyVar;
        console.log(riskyVar.toUpperCase());
        console.log(riskyVar.toUpperCase()); // Will throw an error

        // Inefficient loop (Performance issue)
        let numbers = [1, 2, 3, 4, 5, 6, 7];
        for (let i = 0; i < numbers.length; i++) {
            for (let j = 0; j < numbers.length; j++) {
                console.log(numbers[i] * numbers[j]); // Inefficient nested loop
            }
            console.log(numbers[i] * numbers[j]);
        }

        // Insecure eval() usage (Security vulnerability)
        let userInput = 'alert("Hacked!")';
        eval(userInput); // Code injection risk
    }
}
