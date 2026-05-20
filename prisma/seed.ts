import { PrismaClient, Role } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

const ENTITY_CATEGORIES: Record<string, string[]> = {
  HCD: ['Ordenanzas', 'Resoluciones', 'Minutas', 'Digestos'],
  Hacienda: ['Ordenanzas Fiscales', 'Ordenanzas Impositivas', 'Memoria General Anual'],
  Municipio: ['Decretos', 'Ordenanzas', 'Resoluciones'],
};

const DEFAULT_SETTINGS: Record<string, string> = {
  'tags.defaultCount': '8',
  'extract.maxChars': '500',
  'smtp.from': 'Repositorio Ramallo <no-reply@example.com>',
};

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@ramallo.local';
  const username = process.env.SEED_ADMIN_USERNAME ?? 'admin';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe123!';
  const firstName = process.env.SEED_ADMIN_FIRSTNAME ?? 'Admin';
  const lastName = process.env.SEED_ADMIN_LASTNAME ?? 'Ramallo';

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, username, firstName, lastName, passwordHash, role: Role.ADMIN },
  });
  console.log(`Admin listo: ${admin.email}`);

  for (const [entityName, categories] of Object.entries(ENTITY_CATEGORIES)) {
    const entity = await prisma.entity.upsert({
      where: { name: entityName },
      update: {},
      create: { name: entityName },
    });
    for (const categoryName of categories) {
      await prisma.category.upsert({
        where: { entityId_name: { entityId: entity.id, name: categoryName } },
        update: {},
        create: { name: categoryName, entityId: entity.id },
      });
    }
    console.log(`Entidad ${entityName} con ${categories.length} categorías`);
  }

  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await prisma.appSetting.upsert({
      where: { key },
      update: {},
      create: { key, value },
    });
  }
  console.log('Settings por defecto cargadas');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
