-- CreateTable
CREATE TABLE "words" (
    "id" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "cyrillic" TEXT NOT NULL,
    "latin" TEXT NOT NULL,
    "part_of_speech" TEXT NOT NULL,
    "gender" TEXT,
    "aspect" TEXT,
    "frequency_rank" INTEGER,
    "is_common" BOOLEAN NOT NULL DEFAULT false,
    "homonym_number" INTEGER NOT NULL DEFAULT 0,
    "raw_text" TEXT,
    "inflection_info" TEXT,
    "source" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "words_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "definitions" (
    "id" TEXT NOT NULL,
    "word_id" TEXT NOT NULL,
    "definition_text" TEXT NOT NULL,
    "definition_number" INTEGER NOT NULL DEFAULT 1,
    "register" TEXT,
    "domain" TEXT,
    "sub_letter" TEXT,
    "source" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "examples" (
    "id" TEXT NOT NULL,
    "definition_id" TEXT NOT NULL,
    "example_text" TEXT NOT NULL,
    "source" TEXT,
    "translation" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "examples_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inflections" (
    "id" TEXT NOT NULL,
    "word_id" TEXT NOT NULL,
    "form" TEXT NOT NULL,
    "form_cyrillic" TEXT NOT NULL,
    "form_latin" TEXT NOT NULL,
    "grammatical_info" TEXT,
    "case" TEXT,
    "number" TEXT,
    "gender" TEXT,
    "person" TEXT,
    "tense" TEXT,
    "mood" TEXT,
    "voice" TEXT,
    "definiteness" TEXT,
    "degree" TEXT,

    CONSTRAINT "inflections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pronunciations" (
    "id" TEXT NOT NULL,
    "word_id" TEXT NOT NULL,
    "ipa" TEXT,
    "audio_url" TEXT,
    "syllables" TEXT,
    "stress_position" INTEGER,
    "source" TEXT,

    CONSTRAINT "pronunciations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "etymologies" (
    "id" TEXT NOT NULL,
    "word_id" TEXT NOT NULL,
    "origin_language" TEXT,
    "etymology_text" TEXT NOT NULL,
    "cognates" TEXT,
    "source" TEXT,

    CONSTRAINT "etymologies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "word_relations" (
    "id" TEXT NOT NULL,
    "word_id" TEXT NOT NULL,
    "related_word_id" TEXT NOT NULL,
    "relation_type" TEXT NOT NULL,

    CONSTRAINT "word_relations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "word_of_day" (
    "id" TEXT NOT NULL,
    "word_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "word_of_day_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idioms" (
    "id" TEXT NOT NULL,
    "word_id" TEXT NOT NULL,
    "phrase" TEXT NOT NULL,
    "meaning" TEXT,
    "source" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idioms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "words_word_idx" ON "words"("word");

-- CreateIndex
CREATE INDEX "words_cyrillic_idx" ON "words"("cyrillic");

-- CreateIndex
CREATE INDEX "words_latin_idx" ON "words"("latin");

-- CreateIndex
CREATE INDEX "words_frequency_rank_idx" ON "words"("frequency_rank");

-- CreateIndex
CREATE UNIQUE INDEX "words_cyrillic_part_of_speech_homonym_number_key" ON "words"("cyrillic", "part_of_speech", "homonym_number");

-- CreateIndex
CREATE INDEX "definitions_word_id_idx" ON "definitions"("word_id");

-- CreateIndex
CREATE INDEX "examples_definition_id_idx" ON "examples"("definition_id");

-- CreateIndex
CREATE INDEX "inflections_word_id_idx" ON "inflections"("word_id");

-- CreateIndex
CREATE INDEX "inflections_form_idx" ON "inflections"("form");

-- CreateIndex
CREATE INDEX "inflections_form_cyrillic_idx" ON "inflections"("form_cyrillic");

-- CreateIndex
CREATE INDEX "inflections_form_latin_idx" ON "inflections"("form_latin");

-- CreateIndex
CREATE INDEX "pronunciations_word_id_idx" ON "pronunciations"("word_id");

-- CreateIndex
CREATE INDEX "etymologies_word_id_idx" ON "etymologies"("word_id");

-- CreateIndex
CREATE INDEX "word_relations_word_id_idx" ON "word_relations"("word_id");

-- CreateIndex
CREATE INDEX "word_relations_related_word_id_idx" ON "word_relations"("related_word_id");

-- CreateIndex
CREATE UNIQUE INDEX "word_relations_word_id_related_word_id_relation_type_key" ON "word_relations"("word_id", "related_word_id", "relation_type");

-- CreateIndex
CREATE UNIQUE INDEX "word_of_day_date_key" ON "word_of_day"("date");

-- CreateIndex
CREATE INDEX "word_of_day_date_idx" ON "word_of_day"("date");

-- CreateIndex
CREATE INDEX "idioms_word_id_idx" ON "idioms"("word_id");

-- AddForeignKey
ALTER TABLE "definitions" ADD CONSTRAINT "definitions_word_id_fkey" FOREIGN KEY ("word_id") REFERENCES "words"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "examples" ADD CONSTRAINT "examples_definition_id_fkey" FOREIGN KEY ("definition_id") REFERENCES "definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inflections" ADD CONSTRAINT "inflections_word_id_fkey" FOREIGN KEY ("word_id") REFERENCES "words"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pronunciations" ADD CONSTRAINT "pronunciations_word_id_fkey" FOREIGN KEY ("word_id") REFERENCES "words"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "etymologies" ADD CONSTRAINT "etymologies_word_id_fkey" FOREIGN KEY ("word_id") REFERENCES "words"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "word_relations" ADD CONSTRAINT "word_relations_word_id_fkey" FOREIGN KEY ("word_id") REFERENCES "words"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "word_relations" ADD CONSTRAINT "word_relations_related_word_id_fkey" FOREIGN KEY ("related_word_id") REFERENCES "words"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "word_of_day" ADD CONSTRAINT "word_of_day_word_id_fkey" FOREIGN KEY ("word_id") REFERENCES "words"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idioms" ADD CONSTRAINT "idioms_word_id_fkey" FOREIGN KEY ("word_id") REFERENCES "words"("id") ON DELETE CASCADE ON UPDATE CASCADE;
