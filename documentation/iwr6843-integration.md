# FamilyCare IWR6843 Sensor Selection and Data Mapping

## Decision

FamilyCare selects the **Texas Instruments IWR6843** as the proposed
mmWave radar sensor for a future live-home pilot.

The IWR6843 is the radar integrated circuit rather than a complete
plug-and-play sensor. For development and USB access, the reference
prototype board is the **IWR6843ISK evaluation module**. Other IWR6843
evaluation modules may be considered later if the room layout requires
a different antenna field of view.

The current hackathon prototype does not claim to use a live physical
board. It demonstrates the architecture with:

1. Recorded mmWave point-cloud CSV files.
2. A trained Random Forest fall detector.
3. A hardware-independent simulator for repeatable demonstrations.

This keeps the demo reliable while defining a realistic path from TI's
live sensor output to the existing FamilyCare software.

## Why the IWR6843 fits FamilyCare

The IWR6843 provides:

- 60 GHz to 64 GHz FMCW radar operation.
- Four receiver channels and three transmitter channels.
- Three-dimensional position and radial-velocity sensing when used
  with a compatible antenna board and radar configuration.
- An Arm Cortex-R4F processor, C67x DSP and radar hardware accelerator
  for onboard detection and signal processing.
- UART and other embedded interfaces for sending processed results to
  an edge computer.
- TI Radar Toolbox examples for three-dimensional people tracking.
- Contactless monitoring without recording identifiable camera images.

TI's IWR6843ISK evaluation module exposes point-cloud data and power
through USB, which makes it appropriate for a development prototype.

## Proposed hardware and software stack

| Layer | Proposed component |
|---|---|
| Radar sensor | Texas Instruments IWR6843 |
| Development board | IWR6843ISK evaluation module |
| Device firmware | TI Radar Toolbox 3D People Tracking demo |
| Connection | USB with configuration UART and data UART |
| Edge application | Python UART/TLV parser on a local computer |
| Detection model | FamilyCare Random Forest |
| Application backend | FastAPI |

The 3D People Tracking demo is preferred over raw ADC capture because
it already performs radar processing and outputs a point cloud plus
tracked-object information. FamilyCare does not need to implement the
radar FFT and CFAR signal-processing chain for the hackathon.

## Proposed placement

For an initial pilot, one board would be mounted on a living-room wall
and angled toward the monitored area. The exact height, tilt, boundary
box and radar configuration must be calibrated in the real room.

The pilot must verify:

- Coverage of the main walking and seating areas.
- Visibility near the floor.
- Blind spots caused by walls or large furniture.
- Whether one radar is sufficient for the selected room.
- Correct transformation between sensor coordinates and room height.

FamilyCare must not assume that the sensor's raw `z` coordinate is
physical height until the mounting position and coordinate transform
have been configured and tested.

## IWR6843 output used by FamilyCare

TI's people-tracking firmware sends binary UART packets. Each packet
contains a frame header followed by type-length-value (TLV) messages.
The relevant outputs are:

1. **Point cloud** - detected reflection points with position, Doppler
   velocity and signal-quality information.
2. **Target list** - tracked people or objects with a persistent track
   ID, position, velocity, acceleration and tracking confidence.
3. **Target index** - associates each point-cloud point with a tracked
   target.

The live adapter should consume processed point-cloud and tracking
output. Raw ADC samples are outside the prototype scope.

## Required parser output

The existing feature extractor expects one row for every point in every
radar frame with these exact columns:

```text
frame, DetObj#, x, y, z, v, snr, noise
```

The future UART parser should first produce a normalized record like:

```json
{
  "frame": 1254,
  "point_index": 7,
  "track_id": 1,
  "x_m": -0.31,
  "y_m": 2.48,
  "z_m": 1.21,
  "radial_velocity_mps": -0.42,
  "snr_db": 18.7,
  "noise_db": 4.2
}
```

It can then create the dataset-compatible row used by
`feature_extractor.py`.

## Vendor-output mapping

### Point-cloud and frame fields

| TI output | FamilyCare field | Conversion and purpose |
|---|---|---|
| Frame-header frame number | `frame` | Preserve as the sequential frame identifier. |
| Point position in the TLV array | `DetObj#` | Generate a zero-based point index for each frame. |
| Cartesian X position | `x` | Convert or decompress to metres after applying the configured coordinate transform. |
| Cartesian Y position | `y` | Convert or decompress to metres after applying the configured coordinate transform. |
| Cartesian Z position | `z` | Convert or decompress to metres; use as height only after mounting calibration. |
| Point Doppler | `v` | Radial velocity in metres per second. Do not replace it with tracker `velZ`. |
| Point SNR | `snr` | Convert using the TLV's SNR unit into the scale expected by the model. |
| Point noise, when emitted | `noise` | Convert using the TLV's noise unit into the training-data scale. |

TI firmware versions differ in the exact point-cloud TLV and side
information they emit. If the chosen IWR6843 firmware does not provide
point-level noise, the production adapter must not silently invent a
value. The correct options are to enable a compatible side-information
output or retrain the model without the noise-derived features. A zero
placeholder may be used only for a clearly labelled parser test.

### Tracking fields

| TI tracking output | FamilyCare use |
|---|---|
| `tid` / target ID | Keep points from one tracked resident together. It is not currently a Random Forest feature. |
| Target-index array | Associate each point with its target ID before feature extraction. |
| `posX`, `posY`, `posZ` | Optional smoothed centroid evidence and room-position metadata. |
| `velX`, `velY`, `velZ` | Optional future motion features. These are tracker velocities, not the current point-level `v` field. |
| `accX`, `accY`, `accZ` | Optional future rapid-motion features. |
| Tracking confidence | Reject or flag low-quality tracks before creating an incident. |

On xWRx843 people-tracking implementations, point-cloud and
target-association outputs may refer to adjacent frames. The parser
must follow the selected firmware's specification and buffer frames so
that points are matched to the correct target instead of joining TLVs
only by arrival order.

## Mapping to fall features

After the point rows are normalized, `feature_extractor.py` groups them
by frame and calculates the features used by the Random Forest.

| Fall evidence | IWR6843 source | Current FamilyCare implementation |
|---|---|---|
| Position over time | Point-cloud `x`, `y`, `z` | Start, end, change, range, slope and step statistics for each centroid axis. |
| Approximate body shape/posture | Distribution of point-cloud coordinates | Robust X/Y/Z point-cloud extents and how they change over time. |
| Rapid movement | Point Doppler | Mean, maximum and temporal absolute-velocity statistics. |
| Downward movement | Vertical centroid sequence | `maximum_downward_z_step`, after confirming that transformed Z is vertical. |
| Signal quality | SNR and noise | Mean, standard deviation, minimum and maximum statistics. |
| Movement path | Frame centroids | Three-dimensional centroid path length. |

### Important current limitations

- `maximum_downward_z_step` is a change between frames, not yet a true
  metres-per-second vertical speed. A live version should divide by the
  verified frame interval or use a calibrated tracker velocity.
- Final posture is represented indirectly by ending centroid and
  point-cloud extent features; there is no explicit posture label.
- Floor-dwell time and post-event movement appear in the simulator's
  evidence, but they are not yet trained Random Forest features.
- A live IWR6843 integration must therefore be retrained and validated
  before these values are treated as production evidence.

## End-to-end live-data flow

```text
IWR6843 on IWR6843ISK
    -> TI 3D People Tracking firmware
    -> USB data UART
    -> frame-header and TLV parser
    -> decompress point coordinates and signal values
    -> apply sensor-to-room coordinate transform
    -> associate points with a target ID
    -> rows: frame, DetObj#, x, y, z, v, snr, noise
    -> rolling motion window
    -> feature_extractor.py
    -> fall_detector.py
    -> fall confidence compared with threshold 0.45
    -> radar_adapter.py creates FamilyCare JSON
    -> POST /api/fall-events
    -> resident check-in
    -> resolve or escalate incident
```

## Code boundary for future hardware integration

The current code already provides:

- `feature_extractor.py` for converting a point-cloud recording into
  fixed Random Forest features.
- `fall_detector.py` for model inference.
- `radar_adapter.py` for converting a positive prediction into the
  FamilyCare event schema and sending it to FastAPI.
- `fall_simulator.py` for a hardware-independent demo fallback.

A live pilot would add:

- `iwr6843_uart_parser.py` to reconstruct UART frames and TLVs.
- `iwr6843_adapter.py` to decompress values, align targets, transform
  coordinates and construct rolling point-cloud windows.

Keeping these responsibilities separate means the trained model and
backend API do not need to know the details of TI's UART packet format.

## Validation required before a live pilot

The current Random Forest was trained on a third-party recorded
dataset, not on data collected with the selected IWR6843 setup. Sensor
configuration, antenna pattern, mounting and room geometry can change
the feature distributions.

Before a pilot, the team should:

1. Acquire the chosen IWR6843 evaluation board.
2. Flash and configure the compatible TI 3D People Tracking demo.
3. Verify the UART parser against TI's visualizer output.
4. Record labelled data using the final room mounting position.
5. Include forward, backward and side falls.
6. Include walking, sitting, controlled lying down, crouching, bending,
   exercise and jumping as non-fall activities.
7. Include participants with different heights, builds and mobility.
8. Retrain the model and repeat subject-separated evaluation.
9. Select the confidence threshold using the desired missed-fall and
   false-alert trade-off.
10. Conduct tests with furniture and realistic room occlusion.

## Hackathon claim boundary

For the hackathon, the team can accurately state:

> FamilyCare proposes the TI IWR6843 for privacy-preserving 3D
> point-cloud sensing. The current proof of concept demonstrates the
> downstream pipeline using recorded radar data and a simulator. A live
> pilot would add a TI UART adapter and retrain the model using data from
> the final sensor and mounting configuration.

The team should not claim that the current Random Forest has already
been physically tested or validated on the IWR6843.

## Privacy and safety boundaries

- Radar points are used instead of identifiable camera images.
- Raw point clouds should remain on the in-home edge computer where
  practical.
- Only incidents and minimum supporting measurements should be sent to
  the backend.
- FamilyCare is a safety-support prototype, not a certified medical
  device or a replacement for emergency services.
- A possible fall should request resident confirmation before
  escalation when the resident is able to respond.

## Official references

- [TI IWR6843 product information](https://www.ti.com/product/IWR6843)
- [TI IWR6843ISK evaluation module](https://www.ti.com/tool/IWR6843ISK)
- [TI 3D People Tracking user guide](https://dev.ti.com/tirex/explore/content/radar_toolbox_4_00_00_05/source/ti/examples/Industrial_and_Personal_Electronics/People_Tracking/3D_People_Tracking/docs/3d_people_tracking_user_guide.html)
- [TI people-counting and tracking reference design](https://www.ti.com/tool/TIDEP-01000)
- [TI Radar Toolbox](https://www.ti.com/tool/RADAR-TOOLBOX)
- [TI mmWave SDK](https://www.ti.com/tool/MMWAVE-SDK)
