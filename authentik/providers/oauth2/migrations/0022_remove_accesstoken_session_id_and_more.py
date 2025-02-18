# Generated by Django 5.0.9 on 2024-10-23 13:38

from hashlib import sha256
import django.db.models.deletion
from django.db import migrations, models
from django.apps.registry import Apps
from django.db.backends.base.schema import BaseDatabaseSchemaEditor
from authentik.lib.migrations import progress_bar


def migrate_session(apps: Apps, schema_editor: BaseDatabaseSchemaEditor):
    AuthenticatedSession = apps.get_model("authentik_core", "authenticatedsession")
    AuthorizationCode = apps.get_model("authentik_providers_oauth2", "authorizationcode")
    AccessToken = apps.get_model("authentik_providers_oauth2", "accesstoken")
    RefreshToken = apps.get_model("authentik_providers_oauth2", "refreshtoken")
    db_alias = schema_editor.connection.alias

    print(f"\nFetching session keys, this might take a couple of minutes...")
    session_ids = {}
    for session in progress_bar(AuthenticatedSession.objects.using(db_alias).all()):
        session_ids[sha256(session.session_key.encode("ascii")).hexdigest()] = session.session_key
    for model in [AuthorizationCode, AccessToken, RefreshToken]:
        print(
            f"\nAdding session to {model._meta.verbose_name}, this might take a couple of minutes..."
        )
        for code in progress_bar(model.objects.using(db_alias).all()):
            if code.session_id_old not in session_ids:
                continue
            code.session = (
                AuthenticatedSession.objects.using(db_alias)
                .filter(session_key=session_ids[code.session_id_old])
                .first()
            )
            code.save()


class Migration(migrations.Migration):

    dependencies = [
        ("authentik_core", "0040_provider_invalidation_flow"),
        ("authentik_providers_oauth2", "0021_oauth2provider_encryption_key_and_more"),
    ]

    operations = [
        migrations.RenameField(
            model_name="accesstoken",
            old_name="session_id",
            new_name="session_id_old",
        ),
        migrations.RenameField(
            model_name="authorizationcode",
            old_name="session_id",
            new_name="session_id_old",
        ),
        migrations.RenameField(
            model_name="refreshtoken",
            old_name="session_id",
            new_name="session_id_old",
        ),
        migrations.AddField(
            model_name="accesstoken",
            name="session",
            field=models.ForeignKey(
                default=None,
                null=True,
                on_delete=django.db.models.deletion.SET_DEFAULT,
                to="authentik_core.authenticatedsession",
            ),
        ),
        migrations.AddField(
            model_name="authorizationcode",
            name="session",
            field=models.ForeignKey(
                default=None,
                null=True,
                on_delete=django.db.models.deletion.SET_DEFAULT,
                to="authentik_core.authenticatedsession",
            ),
        ),
        migrations.AddField(
            model_name="devicetoken",
            name="session",
            field=models.ForeignKey(
                default=None,
                null=True,
                on_delete=django.db.models.deletion.SET_DEFAULT,
                to="authentik_core.authenticatedsession",
            ),
        ),
        migrations.AddField(
            model_name="refreshtoken",
            name="session",
            field=models.ForeignKey(
                default=None,
                null=True,
                on_delete=django.db.models.deletion.SET_DEFAULT,
                to="authentik_core.authenticatedsession",
            ),
        ),
        migrations.RunPython(migrate_session),
        migrations.RemoveField(
            model_name="accesstoken",
            name="session_id_old",
        ),
        migrations.RemoveField(
            model_name="authorizationcode",
            name="session_id_old",
        ),
        migrations.RemoveField(
            model_name="refreshtoken",
            name="session_id_old",
        ),
    ]
