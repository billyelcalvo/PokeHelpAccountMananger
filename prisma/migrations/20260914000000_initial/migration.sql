-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Account" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pokemon" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "ivId" INTEGER NOT NULL,
    "typeId" INTEGER NOT NULL,
    "accountId" INTEGER NOT NULL,

    CONSTRAINT "Pokemon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IV" (
    "id" SERIAL NOT NULL,
    "attack" INTEGER NOT NULL,
    "hp" INTEGER NOT NULL,
    "defense" INTEGER NOT NULL,

    CONSTRAINT "IV_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PokemonType" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "icon" TEXT NOT NULL,

    CONSTRAINT "PokemonType_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Pokemon" ADD CONSTRAINT "Pokemon_ivId_fkey" FOREIGN KEY ("ivId") REFERENCES "IV"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pokemon" ADD CONSTRAINT "Pokemon_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "PokemonType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pokemon" ADD CONSTRAINT "Pokemon_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
