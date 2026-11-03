import json

from django.core.management.base import BaseCommand
from django.db import connection
from django.db.migrations.executor import MigrationExecutor


class Command(BaseCommand):
    help = "Return migration metadata only, without exposing settings or patient records"

    def handle(self, *args, **options):
        executor = MigrationExecutor(connection)
        plan = executor.migration_plan(executor.loader.graph.leaf_nodes())
        self.stdout.write(json.dumps({
            "pending": len(plan),
            "existing_schema": bool(executor.loader.applied_migrations),
            "migrations": [{"app": migration.app_label, "name": migration.name,
                            "operations": [type(operation).__name__ for operation in migration.operations]}
                           for migration, _backwards in plan],
        }))
