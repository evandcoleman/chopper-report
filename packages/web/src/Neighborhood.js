import { useState, useEffect } from 'react';

import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Stack from 'react-bootstrap/Stack';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Popover from 'react-bootstrap/Popover';

import * as moment from 'moment';

import {
  IoHomeOutline as HomeIcon,
  IoAirplaneOutline as PlaneIcon,
} from 'react-icons/io5';
import { GiWhirlwind as WindIcon } from "react-icons/gi";

function Neighborhood({ api, debug, options, location, radius, aircrafts, allIcao24s }) {

  const [address, setAddress] = useState(null);
  const [state, setState] = useState({
    metadata: {},
    states: {},
    hoverTimes: {},
  });

  useEffect(() => {
    try {
      (async () => {
        // const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${location.latitude}&lon=${location.longitude}&format=json`);
        // const { address } = await response.json();
        // setAddress(address);

        if (!state.startTime) {
          const start = moment().subtract(7, 'days');
          const history = await api.hoveringHistory(location, 2000, start.unix());
          const grouped = history
            .reduce((values, value) => ({
              ...values,
              [value.icao24]: [
                ...(values[value.icao24] || []),
                value
              ],
            }), {});

          const icaos = Object.values(grouped)
            .sort((a, b) => b.length - a.length)
            .map(x => x[0].icao24);
          const metadata = await Promise
            .all(icaos.map(icao24 => api.metadata({ icao24 }).then(x => ({ ...x, icao24 }))));
          const states = await Promise
            .all(icaos.map(icao24 => api.lastState(icao24)));

          setState(state => ({
            ...state,
            startTime: start,
            hoverTime: history.reduce((sum, value) => sum + value.hoverTime, 0),
            topOffenders: metadata.map(x => ({ callsign: x.registration, icao24: x.icao24 })),
            metadata: metadata.reduce((values, value) => ({ ...values, [value.icao24]: value }), {}),
            states: states.reduce((values, value) => ({ ...values, [value.icao24]: value }), {}),
            hoverTimes: Object.keys(grouped).reduce((values, icao24) => ({ ...values, [icao24]: grouped[icao24].reduce((sum, cur) => sum + cur.hoverTime, 0) }), {}),
          }));
        }
      })();
    } catch (error) {
      console.log(error);
    }
  }, [location, radius, api]);

  const presentIcaos = allIcao24s.filter(icao24 => aircrafts[icao24]);

  let alertText = '';
  let alertIcon = '';
  if (presentIcaos.length <= 0) {
    alertText = "Nothing is hovering near you at the moment";
    alertIcon = "🙌";
  } else if (presentIcaos.length === 1) {
    alertText = "There's one aircraft hovering near you";
    alertIcon = "😩";
  } else {
    alertText = `There are ${presentIcaos.length} aircrafts hovering near you`;
    alertIcon = "🤬";
  }

  const renderOverlay = (props) => (
    <Popover id="aircraft-overlay" {...props} className="bg-light text-dark text-nowrap">
      <Popover.Header as="h3">
        {state.metadata[props.icao24]?.callsign}
      </Popover.Header>
      <Popover.Body>
        <Container fluid className="p-0">
          {state.metadata[props.icao24]?.photos && <Row>
            <Col xs={12}>
              <img alt="aircraft" className="thumbnail" src={state.metadata[props.icao24].photos[0]} />
            </Col>
          </Row>}
          {state.metadata[props.icao24]?.manufacturer && <Row className="flex-nowrap">
            <small className="text-muted" style={{ width: 'auto' }}>Manufacturer</small>
            <small className="text-end ms-auto" style={{ width: 'auto' }}>{state.metadata[props.icao24].manufacturer}</small>
          </Row>}
          {state.metadata[props.icao24]?.model && <Row className="flex-nowrap">
            <small className="text-muted" style={{ width: 'auto' }}>Model</small>
            <small className="text-end ms-auto" style={{ width: 'auto' }}>{state.metadata[props.icao24].model}</small>
          </Row>}
          {state.states[props.icao24]?.last_contact && <Row className="flex-nowrap">
            <small className="text-muted" style={{ width: 'auto' }}>Last Seen</small>
            <small className="text-end ms-auto" style={{ width: 'auto' }}>{moment.unix(state.states[props.icao24].last_contact).fromNow()}</small>
          </Row>}
          {state.hoverTimes[props.icao24] && <Row className="flex-nowrap">
            <small className="text-muted" style={{ width: 'auto' }}>In The Area</small>
            <small className="text-end ms-auto" style={{ width: 'auto' }}>{moment.duration(state.hoverTimes[props.icao24], 'seconds').humanize()}</small>
          </Row>}
        </Container>
      </Popover.Body>
    </Popover>
  );

  return (
    <div className={allIcao24s.length > 0 ? 'mb-2' : 'mb-2 mt-auto'}>
      <Stack className="bg-dark text-light pb-3" style={{ opacity: 0.9, borderRadius: '1rem' }} >
        <Stack direction="horizontal" className="px-3 pt-3 pb-2">
          <span className="text-start">{alertText}</span>
          <span className="ms-auto text-end fs-3">{alertIcon}</span>
        </Stack>
        <Container fluid>
          {address && <Row className="ps-1">
            <Col xs={1}>
              <HomeIcon className="text-muted" style={{ width: 20, height: 20 }} />
            </Col>
            <Col xs={11} className="text-start">
              <small className="fw-bolder text-muted text-uppercase" style={{ fontSize: '0.8rem' }}>Neighborhood</small>
              <div className="fs-6 pb-2">{address.neighbourhood}</div>
            </Col>
          </Row>}
          {state.startTime && <Row className="mt-3 ps-1">
            <Col xs={12} className="text-start">
              <span>In your area in the last {moment().diff(state.startTime, 'days')} days</span>
            </Col>
          </Row>}
          {state.hoverTime && <Row className="mt-3 ps-1">
            <Col xs={1}>
              <WindIcon className="text-muted" style={{ width: 20, height: 20 }} />
            </Col>
            <Col xs={11} className="text-start">
              <small className="fw-bolder text-muted text-uppercase" style={{ fontSize: '0.8rem' }}>Aircrafts have hovered for</small>
              <div className="fs-6 pb-2">{moment.duration(state.hoverTime, 'seconds').humanize()}</div>
            </Col>
          </Row>}
          {state.topOffenders && <Row className="mt-3 ps-1">
            <Col xs={1}>
              <PlaneIcon className="text-muted" style={{ width: 20, height: 20 }} />
            </Col>
            <Col xs={11} className="text-start">
              <small className="fw-bolder text-muted text-uppercase" style={{ fontSize: '0.8rem' }}>Top Offenders</small>
              <div className="fs-6 pb-2">{state.topOffenders?.map(({ callsign, icao24 }, index) => (
                <OverlayTrigger
                  key={callsign}
                  placement="top"
                  delay={{ show: 250, hide: 250 }}
                  overlay={(props) => renderOverlay({ ...props, icao24 })}
                >
                  <span>{callsign}{index === state.topOffenders.length - 1 ? '' : ', '}</span>
                </OverlayTrigger>
              ))}</div>
            </Col>
          </Row>}
        </Container>
      </Stack>
    </div>
  );
}

export default Neighborhood;