export function isPositiveInput(input) {
  // Check if the input is a number and is negative
  if (isNaN(input) || input < 0) {
    return false; // Invalid input
  }
  return true; // Valid input
}

export function isValidEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

export function isLettersAndSpacesOnly(str) {
  const regex = /^[A-Za-z\s]+$/;
  return regex.test(str);
}
