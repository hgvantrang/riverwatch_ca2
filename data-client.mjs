export async function readJson(url) {
    const response = await fetch(url, {
        cache: 'no-store',
        signal: AbortSignal.timeout(20000)
    });
    if (!response.ok) {
        throw new Error(`HTTP ${response.status} from ${new URL(url).hostname}`);
    }
    return response.json();
}

export async function readLiveJson(sourceUrl, proxyUrl) {
    try {
        return await readJson(sourceUrl);
    } catch (sourceError) {
        if (!proxyUrl) throw sourceError;
        try {
            return await readJson(proxyUrl);
        } catch (proxyError) {
            throw new Error(`Source unavailable (${sourceError.message}); backup unavailable (${proxyError.message}).`);
        }
    }
}
