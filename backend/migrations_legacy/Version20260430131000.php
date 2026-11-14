<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260430131000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Normalize Doctrine-generated company schema details.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE company ALTER stage DROP DEFAULT');
        $this->addSql('ALTER TABLE company ALTER status DROP DEFAULT');
        $this->addSql('ALTER INDEX idx_6d584bb1979b1ad6 RENAME TO IDX_4D7B9E0D979B1AD6');
        $this->addSql('ALTER INDEX idx_6d584bb1a76ed395 RENAME TO IDX_4D7B9E0DA76ED395');
        $this->addSql('ALTER INDEX idx_b05fe5e979b1ad6 RENAME TO IDX_BD8A06AB979B1AD6');
        $this->addSql('ALTER INDEX idx_b05fe5e739988e7 RENAME TO IDX_BD8A06ABDB403044');
    }

    public function down(Schema $schema): void
    {
        $this->addSql("ALTER TABLE company ALTER stage SET DEFAULT 'IDEA'");
        $this->addSql("ALTER TABLE company ALTER status SET DEFAULT 'PENDING'");
        $this->addSql('ALTER INDEX idx_4d7b9e0d979b1ad6 RENAME TO IDX_6D584BB1979B1AD6');
        $this->addSql('ALTER INDEX idx_4d7b9e0da76ed395 RENAME TO IDX_6D584BB1A76ED395');
        $this->addSql('ALTER INDEX idx_bd8a06ab979b1ad6 RENAME TO IDX_B05FE5E979B1AD6');
        $this->addSql('ALTER INDEX idx_bd8a06abdb403044 RENAME TO IDX_B05FE5E739988E7');
    }
}
