export async function extractImageProps(src: string) {
  const image = new window.Image();

  const waitForLoad = new Promise((resolve) => {
    image.onload = () => resolve(true);
  });

  image.src = src;

  await waitForLoad;

  return {
    width: image.naturalWidth,
    height: image.naturalHeight,
    src: src,
  };
}
