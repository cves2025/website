/**
 * Staff Attendance > Attendance Settings (admin): the school point and
 * radius, Wi-Fi check, check-out, time rules, selfie, non-teaching staff.
 * The mobile app's check-in and the server read these (the server checks
 * every rule again). Save is ON only after a change and asks for the password.
 */
import { useContext, useEffect, useState } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import toast from "react-hot-toast";
import { LocateFixed, Plus, Trash2 } from "lucide-react";

import {
  CVES_BUTTON,
  STAFF_LATE_TO_HALF_DAY_OPTIONS,
  STAFF_RADIUS_OPTIONS,
} from "../../../constants";
import CustomInput from "../../../custom-components/CustomInput";
import CustomSelect from "../../../custom-components/CustomSelect";
import CustomToggle from "../../../custom-components/CustomToggle";
import Loader, { Spinner } from "../../../custom-components/Loader";
import PageHeader from "../../../custom-components/PageHeader";
import TimePicker from "../../../custom-components/TimePicker";
import Tooltip from "../../../custom-components/Tooltip";
import { useStaffAttendanceSettings } from "../../../hooks/useStaffAttendance";
import { usePasswordConfirm } from "../../../hooks/usePasswordConfirm";
import { isBssid, saveStaffSettings } from "../../../utils/staffAttendanceService";
import type { StaffAttendanceSettings as Settings } from "../../../utils/type";
import { myContext } from "../../context/MyContextProvider";

const ON = "on";
const OFF = "off";

interface SettingsForm {
  lat: string;
  lng: string;
  radiusM: string;
  wifiCheck: string;
  wifiNetworks: { name: string; bssid: string }[];
  qrCheck: string;
  checkOut: string;
  lateAfter: string;
  halfDayAfter: string;
  earlyLeaveBefore: string;
  lateToHalfDay: string;
  selfie: string;
  includeStaff: string;
}

const onOff = (value: boolean) => (value ? ON : OFF);

const toForm = (settings: Settings): SettingsForm => ({
  lat: settings.location ? String(settings.location.lat) : "",
  lng: settings.location ? String(settings.location.lng) : "",
  radiusM: String(settings.radiusM),
  wifiCheck: onOff(settings.wifiCheck),
  wifiNetworks: settings.wifiNetworks.map((item) => ({ ...item })),
  qrCheck: onOff(settings.qrCheck),
  checkOut: onOff(settings.checkOut),
  lateAfter: settings.lateAfter,
  halfDayAfter: settings.halfDayAfter,
  earlyLeaveBefore: settings.earlyLeaveBefore,
  lateToHalfDay: String(settings.lateToHalfDay),
  selfie: onOff(settings.selfie),
  includeStaff: onOff(settings.includeStaff),
});

const toMinutes = (value: string) => {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
};

const sectionClass = "rounded-lg border border-gray-200 bg-white p-4";
const labelClass = "mb-1.5 block text-sm font-semibold text-gray-700";

function StaffAttendanceSettings() {
  const { user } = useContext(myContext);
  const { settings, setSettings, loading, error } = useStaffAttendanceSettings();
  const { confirmPassword, passwordDialog } = usePasswordConfirm();
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);

  const form = useForm<SettingsForm>({ defaultValues: toForm(settings) });
  const {
    control,
    reset,
    setValue,
    handleSubmit,
    formState: { isDirty },
  } = form;
  const networks = useFieldArray({ control, name: "wifiNetworks" });
  const values = useWatch({ control });

  useEffect(() => {
    reset(toForm(settings));
  }, [settings, reset]);

  const toggle = (name: keyof SettingsForm) => (value: string) =>
    setValue(name, value, { shouldDirty: true });

  const readThisLocation = () => {
    if (!navigator.geolocation) {
      toast.error("This browser cannot read the location. Set it from the mobile app.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        setValue("lat", position.coords.latitude.toFixed(6), { shouldDirty: true });
        setValue("lng", position.coords.longitude.toFixed(6), { shouldDirty: true });
        toast.success(`Location read (accurate to about ${Math.round(position.coords.accuracy)} m).`);
      },
      () => {
        setLocating(false);
        toast.error("The location could not be read. Allow location access, or set it from the mobile app.");
      },
      { enableHighAccuracy: true, timeout: 20000 }
    );
  };

  const onSave = async (data: SettingsForm) => {
    if (!user) return;
    const lat = Number(data.lat);
    const lng = Number(data.lng);
    const hasPoint = data.lat.trim() !== "" && data.lng.trim() !== "";
    if (hasPoint && (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180)) {
      toast.error("The latitude / longitude is not valid.");
      return;
    }
    if (!data.lateAfter) {
      toast.error("Set the Late after time.");
      return;
    }
    if (data.halfDayAfter && toMinutes(data.halfDayAfter) <= toMinutes(data.lateAfter)) {
      toast.error("Half Day after must be later than Late after.");
      return;
    }
    const wifiNetworks = data.wifiNetworks
      .map((item) => ({ name: item.name.trim(), bssid: item.bssid.trim().toLowerCase() }))
      .filter((item) => item.bssid || item.name);
    if (wifiNetworks.some((item) => !isBssid(item.bssid))) {
      toast.error("A Wi-Fi router ID must look like aa:bb:cc:dd:ee:ff.");
      return;
    }
    if (data.wifiCheck === ON && wifiNetworks.length === 0) {
      toast.error("Add the school Wi-Fi, or switch the Wi-Fi check off.");
      return;
    }
    const next: Settings = {
      location: hasPoint ? { lat, lng } : null,
      radiusM: Number(data.radiusM) || 150,
      wifiCheck: data.wifiCheck === ON,
      wifiNetworks,
      qrCheck: false,
      checkOut: data.checkOut === ON,
      lateAfter: data.lateAfter,
      halfDayAfter: data.halfDayAfter,
      earlyLeaveBefore: data.checkOut === ON ? data.earlyLeaveBefore : "",
      lateToHalfDay: Number(data.lateToHalfDay) || 0,
      selfie: data.selfie === ON,
      includeStaff: data.includeStaff === ON,
    };
    const confirmed = await confirmPassword({
      title: "Save Attendance Settings",
      message: "The check-in rules of every teacher will change.",
      confirmText: "Save",
    });
    if (!confirmed) return;
    setSaving(true);
    try {
      await saveStaffSettings(next, user.uid);
      setSettings(next);
      toast.success("Attendance settings saved.");
    } catch (cause) {
      console.error("Failed to save staff attendance settings:", cause);
      toast.error("Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const renderToggle = (name: keyof SettingsForm, label: string) => (
    <CustomToggle
      control={control}
      name={name}
      activeValue={ON}
      inactiveValue={OFF}
      activeLabel="ON"
      inactiveLabel="OFF"
      ariaLabel={label}
      onChange={toggle(name)}
      wrapperClassName="w-auto shrink-0"
    />
  );

  return (
    <div className="flex flex-col gap-2">
      <PageHeader
        title="Attendance Settings"
        titleStyle="text-primaryBlue"
        description="How teachers check in from the mobile app. The server checks every rule again."
        descriptionStyle="text-gray-500"
      />

      {loading ? (
        <Loader label="Loading settings..." />
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
      ) : (
        <form onSubmit={handleSubmit(onSave)} className="flex flex-col gap-2">
          <section className={sectionClass}>
            <h2 className="mb-1 font-bold text-gray-800">School location</h2>
            <p className="mb-3 text-sm text-gray-500">
              Teachers can check in only inside this circle. Best set from the mobile app while standing in the
              school (Attendance Settings &gt; Use my location); a computer&apos;s location is often off by a lot.
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_160px_auto] sm:items-end">
              <CustomInput control={control} name="lat" label="Latitude" placeholder="e.g. 25.594100" inputMode="decimal" />
              <CustomInput control={control} name="lng" label="Longitude" placeholder="e.g. 85.137600" inputMode="decimal" />
              <CustomSelect control={control} name="radiusM" label="Radius" placeholder={null} options={STAFF_RADIUS_OPTIONS} />
              <button
                type="button"
                onClick={readThisLocation}
                disabled={locating}
                className="flex h-10 items-center justify-center gap-2 rounded-md border border-gray-300 px-4 text-sm font-semibold text-navy hover:bg-navy-soft disabled:opacity-50"
              >
                {locating ? <Spinner size="xs" /> : <LocateFixed className="h-4 w-4" />}
                Use this computer&apos;s location
              </button>
            </div>
            {values.lat && values.lng ? (
              <a
                href={`https://www.google.com/maps?q=${values.lat},${values.lng}`}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-sm font-semibold text-navy underline"
              >
                Check the point on Google Maps
              </a>
            ) : (
              <p className="mt-2 text-sm font-medium text-amber-700">
                Not set yet: teachers cannot check in until the location is saved.
              </p>
            )}
          </section>

          <section className={sectionClass}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="mb-1 font-bold text-gray-800">School Wi-Fi check</h2>
                <p className="text-sm text-gray-500">
                  When ON, the phone must also be connected to one of these Wi-Fi routers. Add a router from the
                  mobile app (Attendance Settings &gt; Add this Wi-Fi) while connected to it. Android phones only.
                </p>
              </div>
              {renderToggle("wifiCheck", "School Wi-Fi check")}
            </div>
            <div className="mt-3 flex flex-col gap-2">
              {networks.fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                  <CustomInput control={control} name={`wifiNetworks.${index}.name`} label="Name" placeholder="e.g. Office Wi-Fi" />
                  <CustomInput control={control} name={`wifiNetworks.${index}.bssid`} label="Router ID (BSSID)" placeholder="aa:bb:cc:dd:ee:ff" />
                  <Tooltip content="Remove this Wi-Fi">
                    <button
                      type="button"
                      onClick={() => networks.remove(index)}
                      aria-label="Remove this Wi-Fi"
                      className="flex h-10 w-10 items-center justify-center rounded-full text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </Tooltip>
                </div>
              ))}
              <button
                type="button"
                onClick={() => networks.append({ name: "", bssid: "" })}
                className="flex w-fit items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-navy hover:bg-navy-soft"
              >
                <Plus className="h-4 w-4" /> Add Wi-Fi by hand
              </button>
            </div>
          </section>

          <section className={sectionClass}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="mb-1 font-bold text-gray-800">QR code check</h2>
                <p className="text-sm text-gray-500">
                  Coming later: a QR code that changes every few seconds on an office screen, scanned at check-in.
                </p>
              </div>
              <CustomToggle
                control={control}
                name="qrCheck"
                activeValue={ON}
                inactiveValue={OFF}
                activeLabel="ON"
                inactiveLabel="Coming soon"
                ariaLabel="QR code check"
                disabled
                wrapperClassName="w-auto shrink-0"
              />
            </div>
          </section>

          <section className={sectionClass}>
            <h2 className="mb-1 font-bold text-gray-800">Timings</h2>
            <p className="mb-3 text-sm text-gray-500">India time, by the server&apos;s clock (a phone&apos;s clock is never used).</p>
            <div className="mb-4 flex items-center justify-between gap-4 rounded-md bg-gray-50 p-3">
              <div>
                <p className="text-sm font-semibold text-gray-800">Check-out</p>
                <p className="text-sm text-gray-500">ON = check-in and check-out; OFF = check-in only.</p>
              </div>
              {renderToggle("checkOut", "Check-out")}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <TimeField control={control} name="lateAfter" label="Late after" required />
              <TimeField control={control} name="halfDayAfter" label="Half Day after (optional)" />
              {values.checkOut === ON && (
                <TimeField control={control} name="earlyLeaveBefore" label="Leaving before = Half Day (optional)" />
              )}
              <CustomSelect
                control={control}
                name="lateToHalfDay"
                label="Lates in a month"
                placeholder={null}
                options={STAFF_LATE_TO_HALF_DAY_OPTIONS}
              />
            </div>
          </section>

          <section className={sectionClass}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="mb-1 font-bold text-gray-800">Selfie</h2>
                <p className="text-sm text-gray-500">
                  When ON, a front-camera photo is required at every check-in / check-out. The admin sees it on Staff
                  Attendance.
                </p>
              </div>
              {renderToggle("selfie", "Selfie")}
            </div>
          </section>

          <section className={sectionClass}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="mb-1 font-bold text-gray-800">Non-teaching staff</h2>
                <p className="text-sm text-gray-500">
                  When ON, staff (no app login) are in the Staff Attendance list and the admin marks them by hand.
                </p>
              </div>
              {renderToggle("includeStaff", "Non-teaching staff")}
            </div>
          </section>

          <div className="flex items-center justify-end gap-3 rounded-lg border border-gray-200 bg-white p-4">
            {isDirty && <span className="text-sm font-medium text-amber-600">Unsaved changes</span>}
            <button
              type="submit"
              disabled={!isDirty || saving}
              className={`flex items-center gap-2 rounded-md px-6 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 ${CVES_BUTTON}`}
            >
              {saving && <Spinner size="xs" tone="white" />}
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </form>
      )}
      {passwordDialog}
    </div>
  );
}

function TimeField({
  control,
  name,
  label,
  required = false,
}: {
  control: ReturnType<typeof useForm<SettingsForm>>["control"];
  name: "lateAfter" | "halfDayAfter" | "earlyLeaveBefore";
  label: string;
  required?: boolean;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <div>
          <label htmlFor={name} className={labelClass}>
            {label}
            {required && <span className="ml-0.5 text-red-500">*</span>}
          </label>
          <div className="flex items-center gap-2">
            <TimePicker id={name} value={field.value} onChange={field.onChange} className="flex-1" />
            {!required && field.value && (
              <Tooltip content="Clear">
                <button
                  type="button"
                  onClick={() => field.onChange("")}
                  aria-label={`Clear ${label}`}
                  className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </Tooltip>
            )}
          </div>
        </div>
      )}
    />
  );
}

export default StaffAttendanceSettings;
