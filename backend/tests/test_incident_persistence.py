from backend.models.events import FallEvent
from backend.services.incident_manager import IncidentManager
from backend.tests.test_fall_events import make_fall_event


def test_incidents_survive_manager_restart(tmp_path):
    store = tmp_path / "incidents.json"
    first_manager = IncidentManager(
        storage_path=store,
        persistence_enabled=True,
    )
    first_manager.create_event(FallEvent(**make_fall_event("persisted-fall")))

    second_manager = IncidentManager(storage_path=store)
    assert second_manager.get_event("persisted-fall").event_type == "possible_fall"
