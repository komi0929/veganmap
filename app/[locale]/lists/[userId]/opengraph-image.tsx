import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'Gourmet List';
export const size = {
    width: 1200,
    height: 630,
};

export const contentType = 'image/png';

export default async function Image({ params }: { params: { userId: string } }) {
    // Ideally fetch user data or stats here based on params.userId
    // For now static attractive card
    return new ImageResponse(
        (
            <div
                style={{
                    background: 'linear-gradient(to bottom right, #111, #333)',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontFamily: 'sans-serif',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                    <div style={{ fontSize: 60 }}>🍽️</div>
                    <h1 style={{ fontSize: 60, fontWeight: 'bold' }}>My Gourmet List</h1>
                </div>
                <div style={{ fontSize: 30, marginTop: 20, opacity: 0.8 }}>
                    Curated Collection
                </div>
                <div style={{
                    position: 'absolute',
                    bottom: 40,
                    display: 'flex',
                    gap: 10,
                    fontSize: 20,
                    opacity: 0.5
                }}>
                    veganmap.jp
                </div>
            </div>
        ),
        {
            ...size,
        }
    );
}
