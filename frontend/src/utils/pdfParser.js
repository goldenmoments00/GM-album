/**
 * Creates a blank canvas to be used as a filler page
 */
export const createBlankPage = (width, height) => {
  const blankCanvas = document.createElement('canvas');
  blankCanvas.width = width;
  blankCanvas.height = height;
  const blankCtx = blankCanvas.getContext('2d');
  blankCtx.fillStyle = '#ffffff';
  blankCtx.fillRect(0, 0, width, height);
  return blankCanvas.toDataURL('image/jpeg', 0.8);
};

/**
 * Slices a wide double-spread canvas into a left and right page
 */
export const sliceSpread = (canvas) => {
  const halfWidth = canvas.width / 2;
  
  const leftCanvas = document.createElement('canvas');
  leftCanvas.width = halfWidth;
  leftCanvas.height = canvas.height;
  leftCanvas.getContext('2d').drawImage(canvas, 0, 0, halfWidth, canvas.height, 0, 0, halfWidth, canvas.height);
  
  const rightCanvas = document.createElement('canvas');
  rightCanvas.width = halfWidth;
  rightCanvas.height = canvas.height;
  rightCanvas.getContext('2d').drawImage(canvas, halfWidth, 0, halfWidth, canvas.height, 0, 0, halfWidth, canvas.height);

  return [
    leftCanvas.toDataURL('image/jpeg', 0.8),
    rightCanvas.toDataURL('image/jpeg', 0.8)
  ];
};
