import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from backend.routes.incidents import router
from backend.models.events import FallEvent
from backend.services.incident_manager import incident_manager

app = FastAPI()
app.include_router(router)
client = TestClient(app)

@pytest.fixture(autouse=True)
def clean_store():
    incident_manager._events.clear()
    event = FallEvent(schema_version='1.0', event_id='workflow-1', event_type='possible_fall',
        source='fall_detector', resident_id='resident-01', location='living_room', severity='critical',
        status='no_response', confidence=.9, timestamp='2026-10-18T10:00:00+08:00',
        requires_resident_check_in=False, requires_responder=True,
        details={'model_version':'test','decision_threshold':.5,'source_file':'test','evidence':{}})
    incident_manager.create_event(event)
    yield
    incident_manager._events.clear()

def post(endpoint, body):
    return client.post('/api/incidents/workflow-1/' + endpoint, json=body)

def assign():
    return post('assign-responder', {'responder_id':'daniel','responder_name':'Daniel Lim','responder_phone':''})

def arrive():
    assert assign().status_code == 200
    for status in ['accepted','on_the_way','arrived']:
        assert post('responder-status', {'responder_status':status}).status_code == 200

def test_full_workflow_is_persisted_and_visible_to_polling_clients():
    arrive()
    report={'summary':'Comfortable after the visit.','resident_condition':'safe','action_taken':'Wellbeing checked.'}
    assert post('visit-report', report).status_code == 200
    detail=client.get('/api/incidents/workflow-1').json()
    assert detail == client.get('/api/incidents').json()[0]
    assert detail['status'] == 'resolved'
    assert detail['responder_name'] == 'Daniel Lim'
    assert detail['responder_status'] == 'resolved'
    assert list(detail['responder_updates']) == ['assigned','accepted','on_the_way','arrived']
    assert detail['visit_report']['summary'] == report['summary']
    assert detail['resolution_timestamp']
    assert post('visit-report', report).status_code == 409

def test_invalid_order_missing_ids_and_duplicate_assignment():
    assert post('responder-status', {'responder_status':'arrived'}).status_code == 409
    assert assign().status_code == 200
    assert assign().status_code == 409
    assert post('responder-status', {'responder_status':'arrived'}).status_code == 409
    assert post('responder-status', {'responder_status':'invalid'}).status_code == 422
    assert client.post('/api/incidents/missing/assign-responder',json={'responder_id':'daniel','responder_name':'Daniel Lim','responder_phone':''}).status_code == 404
    assert client.post('/api/incidents/api/incidents/workflow-1/assign-responder', json={}).status_code == 404

def test_further_assistance_report_does_not_silently_resolve_incident():
    arrive()
    response=post('visit-report',{'summary':'Follow-up requested.','resident_condition':'needs_further_assistance','action_taken':'Checked resident.'})
    event=response.json()['event']
    assert response.status_code == 200
    assert event['status'] == 'no_response'
    assert event['requires_responder'] is True
    assert event['visit_report']['submitted_at']
    assert post('responder-status', {'responder_status':'arrived'}).status_code == 409
