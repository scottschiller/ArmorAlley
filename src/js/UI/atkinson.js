const frac = 1 / 8;

function atkinson(imageName, canvas, ctx, width, height) {
  let thisRow, data;

  let x, y, i, err, newAvg, curAvg;

  if (!canvas || !ctx) return;

  // get image data from live canvas
  data = ctx.getImageData(0, 0, width, height);

  function findClosestValue(pixel) {
    return pixel >= 130 ? 255 : 0;
  }

  function getPixelIndex(x, y) {
    return y * 4 * data.width + x * 4;
  }

  function avg(x, y) {
    let i = getPixelIndex(x, y);
    return (data.data[i] + data.data[i + 1] + data.data[i + 2]) / 3;
  }

  function setPixel(x, y, value) {
    let i = getPixelIndex(x, y);
    data.data[i] = value;
    data.data[i + 1] = value;
    data.data[i + 2] = value;
  }

  // adjust gamma on certain images
  let needsGamma =
    (imageName.match(
      /infantry|balloon|end-bunker|smart-missile|pixel_explosion|dirt-explosion|banana|turret/i
    ) ||
      !imageName.match(
        /cloud|bunker|balloon|chain|grave|turret|chicken|base-burning/i
      )) &&
    !imageName.match(/enemy/i);

  let gammaCorrection;

  if (needsGamma) {
    // TODO: review.
    gammaCorrection = 0.01;

    if (imageName.match(/turret/i)) {
      // special case: turrets are already somewhat bright.
      gammaCorrection = 0.66;
    } else if (imageName.match(/balloon/i)) {
      // extra-special case: work around yuck pattern on left-facing full-width enemy balloon
      gammaCorrection = 1.01;
    } else if (
      imageName.match(
        /landing|dune|rock|smoke|wire|base-burning|banana|pixel_explosion|dirt-explosion/i
      )
    ) {
      // special cases: don't lighten dunes, or landing pads; darken!
      gammaCorrection = 1.2;
    }

    // raw image bytes
    let iData = data.data;

    for (i = 0; i < iData.length; i += 4) {
      iData[i] = 255 * Math.pow(iData[i] / 255, gammaCorrection);
      iData[i + 1] = 255 * Math.pow(iData[i + 1] / 255, gammaCorrection);
      iData[i + 2] = 255 * Math.pow(iData[i + 2] / 255, gammaCorrection);
    }
  }

  for (y = 0; y < height; y++) {
    thisRow = [];
    for (x = 0; x < width; x++) {
      i = y * 4 * width + x * 4;
      curAvg = avg(x, y);
      newAvg = findClosestValue(curAvg);

      setPixel(x, y, newAvg);
      err = curAvg - newAvg;

      setPixel(x + 1, y, avg(x + 1, y) + frac * err);
      setPixel(x + 2, y, avg(x + 2, y) + frac * err);
      setPixel(x - 1, y + 1, avg(x - 1, y + 1) + frac * err);
      setPixel(x, y + 1, avg(x, y + 1) + frac * err);
      setPixel(x + 1, y + 1, avg(x + 1, y + 1) + frac * err);
      setPixel(x, y + 2, avg(x, y + 2) + frac * err);
    }
  }

  ctx.putImageData(data, 0, 0);
}

export { atkinson };
