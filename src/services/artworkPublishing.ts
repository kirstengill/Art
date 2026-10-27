export async function publishArtworkWithSynchronizedProfile<T>(
  imageKey: string,
  synchronizeProfile: () => Promise<void>,
  uploadImage: (dataUrl: string) => Promise<string>,
  saveArtwork: (persistedImageKey: string) => Promise<T>
): Promise<T> {
  await synchronizeProfile();
  const persistedImageKey = imageKey.startsWith('data:image/')
    ? await uploadImage(imageKey)
    : imageKey;
  return saveArtwork(persistedImageKey);
}
