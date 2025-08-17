import clsx from 'clsx';

export default function Button({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={clsx('h-11 rounded-lg px-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white/90 transition', className)}
      {...props}
    />
  );
}
