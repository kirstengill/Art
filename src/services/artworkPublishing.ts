export async function persistImageBeforeSave<T>(
  imageKey: string | undefined,
  uploadImage: (dataUrl: string) => Promise<string>,
  save: (persistedImageKey: string | undefined) => Promise<T>
): Promise<T> {
  const persistedImageKey = imageKey?.startsWith('data:image/')
    ? await uploadImage(imageKey)
    : imageKey;
  return save(persistedImageKey);
}

export async function publishArtworkWithSynchronizedProfile<T>(
  imageKey: string,
  synchronizeProfile: () => Promise<void>,
  uploadImage: (dataUrl: string) => Promise<string>,
  saveArtwork: (persistedImageKey: string) => Promise<T>
): Promise<T> {
  await synchronizeProfile();
  return persistImageBeforeSave(imageKey, uploadImage, (persistedImageKey) => {
    if (!persistedImageKey) {
      throw new Error('Artwork image is required before publishing.');
    }
    return saveArtwork(persistedImageKey);
  });
}
