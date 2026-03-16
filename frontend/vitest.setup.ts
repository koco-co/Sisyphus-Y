import '@testing-library/jest-dom';

// Mock dialog element methods for jsdom
HTMLDialogElement.prototype.showModal = function() {
  this.open = true;
};
HTMLDialogElement.prototype.close = function() {
  this.open = false;
};
