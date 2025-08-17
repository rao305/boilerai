/**
 * Quicksort implementation in JavaScript
 * Time Complexity: O(n log n) average, O(n²) worst case
 * Space Complexity: O(log n) average due to recursion stack
 */

function quicksort(arr) {
  // Base case: arrays with 0 or 1 element are already sorted
  if (arr.length <= 1) {
    return arr;
  }
  
  // Choose pivot (using middle element for better performance on sorted arrays)
  const pivotIndex = Math.floor(arr.length / 2);
  const pivot = arr[pivotIndex];
  
  // Partition array into three parts
  const left = [];
  const right = [];
  
  for (let i = 0; i < arr.length; i++) {
    if (i === pivotIndex) continue; // Skip pivot element
    
    if (arr[i] < pivot) {
      left.push(arr[i]);
    } else {
      right.push(arr[i]);
    }
  }
  
  // Recursively sort left and right partitions, then combine
  return [...quicksort(left), pivot, ...quicksort(right)];
}

/**
 * In-place quicksort implementation for better memory efficiency
 */
function quicksortInPlace(arr, low = 0, high = arr.length - 1) {
  if (low < high) {
    // Partition the array and get the pivot index
    const pivotIndex = partition(arr, low, high);
    
    // Recursively sort elements before and after partition
    quicksortInPlace(arr, low, pivotIndex - 1);
    quicksortInPlace(arr, pivotIndex + 1, high);
  }
  
  return arr;
}

function partition(arr, low, high) {
  // Choose the rightmost element as pivot
  const pivot = arr[high];
  let i = low - 1; // Index of smaller element
  
  for (let j = low; j < high; j++) {
    // If current element is smaller than or equal to pivot
    if (arr[j] <= pivot) {
      i++;
      [arr[i], arr[j]] = [arr[j], arr[i]]; // Swap elements
    }
  }
  
  // Place pivot in correct position
  [arr[i + 1], arr[high]] = [arr[high], arr[i + 1]];
  return i + 1;
}

// Example usage and testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { quicksort, quicksortInPlace };
} else {
  // Browser environment - add to global scope
  window.quicksort = quicksort;
  window.quicksortInPlace = quicksortInPlace;
}

// Test examples
const testArray1 = [64, 34, 25, 12, 22, 11, 90];
const testArray2 = [3, 6, 8, 10, 1, 2, 1];

console.log('Original array:', testArray1);
console.log('Sorted (functional):', quicksort([...testArray1]));

console.log('Original array:', testArray2);
console.log('Sorted (in-place):', quicksortInPlace([...testArray2]));