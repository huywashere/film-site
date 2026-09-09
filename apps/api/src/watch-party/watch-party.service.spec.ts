import { WatchPartyService } from './watch-party.service';

describe('WatchPartyService playback continuity', () => {
  const prisma = {
    watchPartyArchive: { upsert: jest.fn().mockResolvedValue(undefined) },
  };
  const redis = {
    setJson: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
  };
  let service: WatchPartyService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new WatchPartyService(prisma as never, redis as never);
  });

  afterEach(() => service.onModuleDestroy());

  it('broadcasts ended state and the next episode from the host', () => {
    const room = service.createRoom(
      'host-socket-1',
      { movie: { slug: 'series', name: 'Series', episode: 'tap-1' } },
      {
        userId: 'guest-stable-host',
        name: 'Host',
        reconnectToken: '12345678-1234-1234-1234-123456789012',
      },
    );

    const ended = service.updatePlayer('host-socket-1', room.id, 'ended', 1800, 'tap-1');
    const nextEpisode = service.updatePlayer('host-socket-1', room.id, 'episode', 0, 'tap-2');

    expect(ended).toMatchObject({ action: 'ended', currentTime: 1800 });
    expect(nextEpisode).toMatchObject({ action: 'episode', episode: 'tap-2' });
    expect(service.getRoom(room.id)?.movie.episode).toBe('tap-2');
  });

  it('rebinds a reconnecting host without duplicating or transferring control', () => {
    const identity = {
      userId: 'guest-stable-host',
      name: 'Host',
      reconnectToken: '12345678-1234-1234-1234-123456789012',
    };
    const room = service.createRoom(
      'host-socket-1',
      { movie: { slug: 'movie', name: 'Movie', episode: 'full' } },
      identity,
    );

    const rejoined = service.joinRoom('host-socket-2', room.id, identity);

    expect(rejoined.room.hostId).toBe('host-socket-2');
    expect(rejoined.room.participants).toHaveLength(1);
    expect(rejoined.room.participants[0]).toMatchObject({
      id: 'host-socket-2',
      isHost: true,
    });
    expect(service.leaveAll('host-socket-1')).toEqual([]);
    expect(rejoined.room.participants[0]).not.toHaveProperty('reconnectToken');
  });

  it('does not accept a leaked guest id without its private reconnect token', () => {
    const room = service.createRoom(
      'host-socket-1',
      { movie: { slug: 'movie', name: 'Movie', episode: 'full' } },
      {
        userId: 'guest-stable-host',
        name: 'Host',
        reconnectToken: '12345678-1234-1234-1234-123456789012',
      },
    );

    const joined = service.joinRoom('attacker-socket', room.id, {
      userId: 'guest-stable-host',
      name: 'Impersonator',
      reconnectToken: '99999999-9999-9999-9999-999999999999',
    });

    expect(joined.room.hostId).toBe('host-socket-1');
    expect(joined.room.participants).toHaveLength(2);
  });

  it('keeps playback control restricted to the current host', () => {
    const room = service.createRoom(
      'host-socket',
      { movie: { slug: 'movie', name: 'Movie', episode: 'full' } },
      { userId: 'guest-host', name: 'Host' },
    );
    service.joinRoom('viewer-socket', room.id, {
      userId: 'guest-viewer',
      name: 'Viewer',
    });

    expect(() => service.updatePlayer('viewer-socket', room.id, 'episode', 0, 'tap-2')).toThrow(
      'Chỉ trưởng phòng mới có thể điều khiển video.',
    );
  });
});
