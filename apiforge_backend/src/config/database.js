// Prisma Client singleton instance
let prismaInstance = null;

export const database = {
  get client() {
    if (!prismaInstance) {
      try {
        const { PrismaClient } = await import('@prisma/client');
        prismaInstance = new PrismaClient();
      } catch {
        // Mock client fallback if Prisma has not yet generated client
        prismaInstance = {
          $connect: async () => {},
          $disconnect: async () => {},
        };
      }
    }
    return prismaInstance;
  },
  $disconnect: async () => {
    if (prismaInstance?.$disconnect) {
      await prismaInstance.$disconnect();
    }
  },
};

export default database;
