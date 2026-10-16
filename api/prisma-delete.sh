# Clear both Prisma schemas in the existing database.
yarn run dotenv run --override --file .env -- \
  sh -c 'psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
    -c "DROP SCHEMA IF EXISTS public CASCADE" \
    -c "DROP SCHEMA IF EXISTS prisma_contract CASCADE"'

# Recreate tables from the emitted contract.
yarn run dotenv run --override --file .env -- \
  yarn prisma db init

############ test env

  # Clear both Prisma schemas in the existing database.
yarn run dotenv run --override --file .env.test -- \
  sh -c 'psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
    -c "DROP SCHEMA IF EXISTS public CASCADE" \
    -c "DROP SCHEMA IF EXISTS prisma_contract CASCADE"'

# Recreate tables from the emitted contract.
yarn run dotenv run --override --file .env.test -- \
  yarn prisma db init